class PlantModel {
    constructor() {
        this.model = null;
        this.modelCache = new Map();
        this.isLoading = false;
        this.imageProcessor = new ImageProcessor();
    }

    async loadModel() {
        if (this.model) return this.model;
        if (this.isLoading) {
            return new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.model) {
                        clearInterval(checkInterval);
                        resolve(this.model);
                    }
                }, 100);
            });
        }

        try {
            this.isLoading = true;
            await window.loadTensorFlow();
            
            // Try loading from IndexedDB cache first
            const cachedModel = await this.loadFromCache();
            if (cachedModel) {
                this.model = cachedModel;
                return this.model;
            }

            // Load and cache model
            this.model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
            await this.saveToCache(this.model);
            return this.model;
        } catch (error) {
            console.error('Model loading error:', error);
            throw new Error(window.CONFIG.ERRORS.MODEL.LOAD_FAILED);
        } finally {
            this.isLoading = false;
        }
    }

    async classifyImage(imageElement) {
        try {
            this.updateLoadingProgress(1, 'Initializing image analysis...', 0);
            // If TensorFlow failed to load, use only Gemma
            if (typeof tf === 'undefined') {
                return [{
                    label: 'Plant',
                    score: 1.0
                }];
            }

            const model = await this.loadModel();
            if (!model) throw new Error(window.CONFIG.ERRORS.MODEL.LOAD_FAILED);

            this.updateLoadingProgress(1, 'Processing image...', 30);
            // Preprocess image
            const tensor = await this.imageProcessor.processImage(imageElement);

            this.updateLoadingProgress(2, 'Running visual recognition...', 45);
            // Get predictions
            const predictions = await model.predict(tensor).data();
            tensor.dispose();

            this.updateLoadingProgress(2, 'Analyzing results...', 60);
            // Process results
            const results = Array.from(predictions)
                .map((score, i) => ({ score, label: this.getPlantLabel(i) }))
                .filter(p => p.score > window.CONFIG.TENSORFLOW.confidence_threshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, window.CONFIG.TENSORFLOW.top_k);

            this.updateLoadingProgress(3, 'Identifying plant species...', 75);
            if (results.length === 0) {
                return [{ label: 'Plant', score: 1.0 }];
            }

            return results;
        } catch (error) {
            console.error('Classification error:', error);
            // Fallback to basic classification
            return [{ label: 'Plant', score: 1.0 }];
        }
    }

    async enhanceWithGemma(tfPredictions, imageUrl) {
        try {
            this.updateLoadingProgress(3, 'Matching plant characteristics...', 85);
            
            const systemPrompt = `As a botanical expert, analyze this image of a plant. 
                Consider these potential matches: ${tfPredictions.map(p => 
                    `${p.label} (${Math.round(p.score * 100)}% confidence)`).join(', ')}. 
                Provide detailed, accurate information in a valid JSON format.`;

            const userPrompt = `Based on the image provided, return a JSON object with this exact structure:
                {
                    "commonName": "Plant common name",
                    "scientificName": "Scientific name",
                    "description": "Brief description",
                    "characteristics": {
                        "type": "Plant type",
                        "height": "Height range",
                        "spread": "Spread range",
                        "flowering": "Flowering information"
                    },
                    "growingInfo": {
                        "sunlight": "Sunlight needs",
                        "water": "Water requirements",
                        "soil": "Soil preferences"
                    },
                    "quickFacts": ["Fact 1", "Fact 2", "Fact 3"]
                }`;

            this.updateLoadingProgress(4, 'Gathering detailed information...', 90);

            const response = await fetch(window.CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.CONFIG.API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                },
                body: JSON.stringify({
                    model: window.CONFIG.API_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { 
                            role: "user", 
                            content: [
                                { type: "text", text: userPrompt },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from API');
            }

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            try {
                const parsedData = JSON.parse(jsonMatch[0]);
                
                // Validate required fields
                const requiredFields = ['commonName', 'scientificName', 'description'];
                for (const field of requiredFields) {
                    if (!parsedData[field]) {
                        throw new Error(`Missing required field: ${field}`);
                    }
                }

                this.updateLoadingProgress(4, 'Finalizing results...', 100);
                return parsedData;
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                throw new Error('Invalid JSON structure in response');
            }
        } catch (error) {
            console.error('Gemma enhancement error:', error);
            
            // Return a more structured fallback response
            return {
                commonName: tfPredictions[0].label,
                scientificName: "Species unknown",
                description: "A plant matching the visual characteristics detected in the image.",
                characteristics: {
                    type: "Plant",
                    height: "Unknown",
                    spread: "Unknown",
                    flowering: "Unknown"
                },
                growingInfo: {
                    sunlight: "Variable",
                    water: "Moderate",
                    soil: "Well-draining"
                },
                quickFacts: [
                    "This plant was identified using AI image recognition",
                    `Confidence level: ${Math.round(tfPredictions[0].score * 100)}%`,
                    "Detailed information unavailable at this time"
                ]
            };
        }
    }

    updateLoadingStep(step, message) {
        const event = new CustomEvent('loadingStepUpdate', {
            detail: { step, message }
        });
        window.dispatchEvent(event);
    }

    updateLoadingProgress(step, message, progress) {
        // Safely get elements
        const elements = {
            title: document.getElementById('loadingTitle'),
            message: document.getElementById('loadingMessage'),
            fill: document.querySelector('.progress-fill'),
            steps: document.querySelectorAll('.progress-steps .step')
        };

        // Ensure container is visible
        const container = document.getElementById('loadingContainer');
        if (container) {
            container.classList.remove('hidden');
        }

        // Update title with fade effect
        if (elements.title) {
            elements.title.style.opacity = '0';
            setTimeout(() => {
                elements.title.textContent = this.getStepTitle(step);
                elements.title.style.opacity = '1';
            }, 200);
        }

        // Update message with fade effect
        if (elements.message) {
            elements.message.style.opacity = '0';
            setTimeout(() => {
                elements.message.textContent = message;
                elements.message.style.opacity = '1';
            }, 200);
        }

        // Update progress bar
        if (elements.fill) {
            elements.fill.style.width = `${progress}%`;
        }

        // Update steps
        if (elements.steps) {
            elements.steps.forEach((stepEl, index) => {
                stepEl.classList.remove('active', 'completed');
                if (index + 1 < step) {
                    stepEl.classList.add('completed');
                } else if (index + 1 === step) {
                    stepEl.classList.add('active');
                }
            });
        }
    }

    getStepTitle(step) {
        const titles = {
            1: 'Analyzing Image',
            2: 'Identifying Plant',
            3: 'Getting Details'
        };
        return titles[step] || titles[1];
    }

    getPlantLabel(index) {
        // Basic plant categories - extend this with more specific plant types
        const labels = [
            'Flowering Plant', 'Tree', 'Shrub', 'Herb',
            'Succulent', 'Fern', 'Palm', 'Grass',
            'Vine', 'Cactus', 'Orchid', 'Rose',
            'Lily', 'Daisy', 'Tulip', 'Sunflower'
        ];
        return labels[index % labels.length];
    }

    async loadFromCache() {
        try {
            const cache = await caches.open('plant-model-cache');
            const response = await cache.match('model-data');
            if (response) {
                const modelData = await response.json();
                return tf.loadLayersModel(tf.io.fromMemory(modelData));
            }
        } catch (error) {
            console.warn('Cache loading failed:', error);
        }
        return null;
    }

    async saveToCache(model) {
        try {
            const modelData = await model.save(tf.io.withSaveHandler(async modelArtifacts => modelArtifacts));
            const cache = await caches.open('plant-model-cache');
            await cache.put('model-data', new Response(JSON.stringify(modelData)));
        } catch (error) {
            console.warn('Cache saving failed:', error);
        }
    }
}

// Add ImageProcessor class for optimized image handling
class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async processImage(imageData) {
        const img = await this.loadImage(imageData);
        const { width, height } = this.calculateDimensions(img.width, img.height, 224);
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Use hardware acceleration when available
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(img, 0, 0, width, height);
        
        return tf.tidy(() => {
            const tensor = tf.browser.fromPixels(this.canvas)
                .toFloat()
                .expandDims();
            return tensor.div(255.0);
        });
    }

    async loadImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = imageData;
        });
    }

    calculateDimensions(width, height, maxSize) {
        if (width > height) {
            return { width: maxSize, height: Math.round((height / width) * maxSize) };
        } else {
            return { width: Math.round((width / height) * maxSize), height: maxSize };
        }
    }
}

// Initialize with performance optimization
window.plantModel = new PlantModel();

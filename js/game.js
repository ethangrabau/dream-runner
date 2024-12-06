// Initialize game when the page loads
class DreamRunner {
    constructor() {
        console.log("Initializing DreamRunner...");
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.z = 5;
        this.camera.position.y = 2;
        this.camera.rotation.x = -0.2;

        console.log("Setting up lighting...");
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Runner properties
        this.speed = 0.1;
        this.verticalPosition = 0;
        this.isJumping = false;
        this.jumpForce = 0;
        this.gravity = 0.01;

        // Dream world properties
        this.terrain = [];
        this.floatingShapes = [];
        this.currentLayer = 0;
        this.layerColors = [
            new THREE.Color(0x9B4F96), // Purple dream layer
            new THREE.Color(0x48A9A6), // Teal dream layer
            new THREE.Color(0xD4B483)  // Golden dream layer
        ];

        console.log("Creating initial world...");
        // Initialize the world
        this.createInitialTerrain();
        this.createFloatingShapes();

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        console.log("Starting animation loop...");
        // Start animation loop
        this.animate();
    }

    createInitialTerrain() {
        const segments = 20;
        for (let z = 0; z < segments; z++) {
            this.addTerrainSegment(-z * 10);
        }
    }

    addTerrainSegment(zPosition) {
        const geometry = new THREE.PlaneGeometry(10, 10);
        const material = new THREE.MeshPhongMaterial({
            color: this.layerColors[this.currentLayer],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const segment = new THREE.Mesh(geometry, material);
        
        // Rotate and position the segment
        segment.rotation.x = Math.PI / 2;
        segment.position.z = zPosition;
        segment.position.y = -1;

        // Add some wave deformation
        const vertices = segment.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] = Math.sin(vertices[i] / 2 + zPosition / 5) * 0.5;
        }
        segment.geometry.attributes.position.needsUpdate = true;

        this.terrain.push(segment);
        this.scene.add(segment);
    }

    createFloatingShapes() {
        const shapes = 50;
        for (let i = 0; i < shapes; i++) {
            const shape = this.createRandomShape();
            shape.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                -Math.random() * 100
            );
            this.floatingShapes.push(shape);
            this.scene.add(shape);
        }
    }

    createRandomShape() {
        const random = Math.random();
        let geometry;
        
        if (random < 0.33) {
            geometry = new THREE.SphereGeometry(0.3);
        } else if (random < 0.66) {
            geometry = new THREE.TetrahedronGeometry(0.4);
        } else {
            geometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
        }

        const material = new THREE.MeshPhongMaterial({
            color: this.layerColors[this.currentLayer],
            transparent: true,
            opacity: 0.6
        });

        return new THREE.Mesh(geometry, material);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(event) {
        if (event.code === 'Space' && !this.isJumping) {
            console.log("Jump!");
            this.jumpForce = 0.2;
            this.isJumping = true;
            
            // Change dream layer
            this.currentLayer = (this.currentLayer + 1) % this.layerColors.length;
            this.updateWorldColors();
        }
    }

    updateWorldColors() {
        const newColor = this.layerColors[this.currentLayer];
        
        // Update terrain colors
        this.terrain.forEach(segment => {
            segment.material.color = newColor;
        });

        // Update floating shapes
        this.floatingShapes.forEach(shape => {
            shape.material.color = newColor;
        });
    }

    update() {
        // Move forward
        this.camera.position.z -= this.speed;

        // Update vertical position (jumping)
        if (this.isJumping) {
            this.verticalPosition += this.jumpForce;
            this.jumpForce -= this.gravity;

            if (this.verticalPosition <= 0) {
                this.verticalPosition = 0;
                this.isJumping = false;
            }
        }
        this.camera.position.y = 2 + this.verticalPosition;

        // Update terrain
        if (this.terrain[0].position.z > this.camera.position.z + 10) {
            const oldSegment = this.terrain.shift();
            this.scene.remove(oldSegment);
            this.addTerrainSegment(this.terrain[this.terrain.length - 1].position.z - 10);
        }

        // Animate floating shapes
        this.floatingShapes.forEach(shape => {
            shape.rotation.x += 0.01;
            shape.rotation.y += 0.01;
            if (shape.position.z > this.camera.position.z + 10) {
                shape.position.z -= 100;
                shape.position.x = (Math.random() - 0.5) * 20;
                shape.position.y = Math.random() * 10;
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    console.log("Page loaded, starting game...");
    new DreamRunner();
});
// Moon Runner Game Implementation

class DreamRunner {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // World properties
        this.worldRadius = 200; // Doubled from 100
        
        // Player movement properties
        this.position = new THREE.Vector3(0, this.worldRadius + 2, 0); // Added 2 units above surface
        this.direction = new THREE.Vector3(1, 0, 0); // Initial direction (east)
        this.speed = 0.02; // Doubled from 0.01
        this.turnSpeed = 0.04;
        this.runCycle = 0;
        
        // Camera properties
        this.cameraDistance = 60; // Doubled to match world scale
        this.cameraHeight = 50;   // Doubled to match world scale

        // Initialize keyboard controls
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Lighting
        // Add ambient light for uniform global illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        // Add hemisphere light for subtle sky/ground variation
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        this.scene.add(hemisphereLight);

        // Add multiple directional lights around the globe
        const lightPositions = [
            [1, 1, 1],
            [-1, 1, -1],
            [1, -1, -1],
            [-1, -1, 1]
        ];

        lightPositions.forEach(pos => {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(...pos);
            this.scene.add(directionalLight);
        });

        // Add stars to background
        this.createStarfield();

        // Create the player character
        this.createPlayer();

        // Create Earth
        this.createEarth();

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    createPlayer() {
        // Create player group for animations
        this.playerGroup = new THREE.Group();
        
        // Create body group to handle leaning
        this.bodyGroup = new THREE.Group();
        
        // Create a simple astronaut character
        const bodyGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        this.player = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Create legs group to handle running animation
        this.legsGroup = new THREE.Group();
        this.legsGroup.position.y = -1; // Position legs at bottom of body
        
        // Create legs
        this.leftLeg = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.6, 4, 8),
            bodyMaterial
        );
        this.rightLeg = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.6, 4, 8),
            bodyMaterial
        );
        
        // Position legs relative to legs group
        this.leftLeg.position.set(-0.6, -0.8, 0);
        this.rightLeg.position.set(0.6, -0.8, 0);
        
        // Add legs to legs group
        this.legsGroup.add(this.leftLeg);
        this.legsGroup.add(this.rightLeg);
        
        // Add a helmet
        const helmetGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const helmetMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            transparent: true,
            opacity: 0.5
        });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1.4;
        
        // Build hierarchy: bodyGroup contains player and helmet
        this.bodyGroup.add(this.player);
        this.bodyGroup.add(helmet);
        
        // Add bodyGroup and legsGroup to main playerGroup
        this.playerGroup.add(this.bodyGroup);
        this.playerGroup.add(this.legsGroup);
        
        this.scene.add(this.playerGroup);
    }

    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1
        });

        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    createEarth() {
        const geometry = new THREE.SphereGeometry(this.worldRadius, 64, 64);
        
        // Create a basic material with deeper blue for oceans
        const material = new THREE.MeshPhongMaterial({
            color: 0x1a4d7c,     // Deeper ocean blue
            shininess: 25
        });

        this.earth = new THREE.Mesh(geometry, material);
        
        // Load texture after creating the sphere
        const textureLoader = new THREE.TextureLoader();
        
        // Use NASA's Blue Marble texture for more accurate geography
        textureLoader.load(
            'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.200409.3x5400x2700.jpg',
            (texture) => {
                material.map = texture;
                material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.error('Error loading NASA texture, falling back to alternate source');
                // Fallback to alternate source if NASA image fails
                textureLoader.load(
                    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
                    (texture) => {
                        material.map = texture;
                        material.needsUpdate = true;
                    }
                );
            }
        );

        // Add bump mapping for terrain
        textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
            (texture) => {
                material.bumpMap = texture;
                material.bumpScale = 1;
                material.needsUpdate = true;
            }
        );

        // Add subtle clouds
        const cloudGeometry = new THREE.SphereGeometry(this.worldRadius + 0.5, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'),
            transparent: true,
            opacity: 0.3
        });

        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.earth.add(this.clouds);

        // Rotate to align texture correctly
        this.earth.rotation.y = Math.PI;
        this.scene.add(this.earth);
    }

    updateRunningAnimation() {
        const isMovingForward = this.keys['ArrowUp'];
        const isMovingBackward = this.keys['ArrowDown'];
        
        if (isMovingForward || isMovingBackward) {
            // Update run cycle
            this.runCycle += 0.05;
            const legAngle = Math.sin(this.runCycle) * 0.3; // Reduced leg swing
            
            // Apply leg animations
            this.leftLeg.rotation.x = -legAngle;
            this.rightLeg.rotation.x = legAngle;
            
            // Add forward/backward lean to body only
            const leanAngle = isMovingForward ? 0.2 : -0.2; // Reduced lean
            this.bodyGroup.rotation.x = leanAngle;
        } else {
            // Reset all animations when not moving
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.bodyGroup.rotation.x = 0;
        }
    }

    updatePlayerPosition() {
        // Handle rotation first
        if (this.keys['ArrowLeft']) {
            // Rotate direction vector around up vector
            const up = this.position.clone().normalize();
            this.direction.applyAxisAngle(up, this.turnSpeed);
        }
        if (this.keys['ArrowRight']) {
            const up = this.position.clone().normalize();
            this.direction.applyAxisAngle(up, -this.turnSpeed);
        }

        // Normalize direction to prevent drift
        this.direction.normalize();

        if (this.keys['ArrowUp'] || this.keys['ArrowDown']) {
            // Get movement direction
            const moveSpeed = this.keys['ArrowUp'] ? this.speed : -this.speed;
            
            // Calculate right vector
            const up = this.position.clone().normalize();
            const right = new THREE.Vector3().crossVectors(up, this.direction);
            
            // Recalculate forward direction to ensure it's perpendicular to up
            const forward = new THREE.Vector3().crossVectors(right, up);
            
            // Create rotation matrix for movement along great circle
            const moveMatrix = new THREE.Matrix4();
            moveMatrix.makeRotationAxis(right, moveSpeed);
            
            // Apply rotation to position
            this.position.applyMatrix4(moveMatrix);
            this.direction.applyMatrix4(moveMatrix);
            
            // Normalize vectors to prevent drift
            this.position.normalize().multiplyScalar(this.worldRadius);
            this.direction.normalize();
        }

        // Update player position and orientation
        this.playerGroup.position.copy(this.position);
        
        // Orient player to surface
        const up = this.position.clone().normalize();
        const right = new THREE.Vector3().crossVectors(up, this.direction);
        const forward = new THREE.Vector3().crossVectors(right, up);
        
        const orientation = new THREE.Matrix4().makeBasis(right, up, forward);
        this.playerGroup.setRotationFromMatrix(orientation);

        // Update running animation
        this.updateRunningAnimation();

        // Update camera position
        const cameraUp = up.clone().multiplyScalar(this.cameraHeight);
        const cameraBack = forward.clone().multiplyScalar(-this.cameraDistance);
        
        this.camera.position.copy(this.position)
            .add(cameraUp)
            .add(cameraBack);
        
        this.camera.lookAt(this.position);
        this.camera.up.copy(up);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update player and camera
        this.updatePlayerPosition();
        
        // Slowly rotate clouds for atmosphere
        if (this.clouds) {
            this.clouds.rotation.y += 0.0001;
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new DreamRunner();
});
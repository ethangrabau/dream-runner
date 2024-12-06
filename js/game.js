class BeanBagRunner {
    constructor() {
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.direction = new THREE.Vector3(0, 0, -1);
        this.isFlying = false;
        this.lastPosition = new THREE.Vector3();
        this.setup();
        this.createCharacter();
        this.createInfiniteGround();
        this.createTreescape();
        this.setupControls();
        this.animate();
    }

    setup() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 4, 8);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        this.runningSpeed = 0.8;
        this.score = 0;
        this.trees = [];
        this.groundY = 2;
        this.maxFlyHeight = 15;
        this.treeChunks = new Map();
        this.chunkSize = 100;
    }

    createCharacter() {
        this.character = new THREE.Group();
        
        const bodyGeometry = new THREE.BoxGeometry(1, 1.2, 0.8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x6A5ACD });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 1, 0.8);
        this.character.add(body);

        this.leftLeg = this.createSegmentedLeg();
        this.rightLeg = this.createSegmentedLeg();
        this.leftLeg.position.set(-0.3, -0.6, 0);
        this.rightLeg.position.set(0.3, -0.6, 0);
        this.character.add(this.leftLeg);
        this.character.add(this.rightLeg);

        this.character.position.set(0, this.groundY, 0);
        this.character.rotation.y = Math.PI;
        this.scene.add(this.character);
    }

    createSegmentedLeg() {
        const leg = new THREE.Group();
        const legMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const upperLegGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const upperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        upperLeg.position.y = -0.2;
        leg.add(upperLeg);
        const lowerLegGeometry = new THREE.BoxGeometry(0.12, 0.4, 0.12);
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        lowerLeg.position.y = -0.6;
        leg.add(lowerLeg);
        return leg;
    }

    createInfiniteGround() {
        const size = 2000;
        const geometry = new THREE.PlaneGeometry(size, size, 100, 100);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x000000, 
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.scene.add(this.ground);
    }

    createTree(x, y, z) {
        const group = new THREE.Group();
        
        const trunkHeight = 1.5 + Math.random() * 2;
        const topHeight = 1.5 + Math.random() * 1.5;
        
        const trunkGeometry = new THREE.BoxGeometry(0.1, trunkHeight, 0.1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.5
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, material);
        trunk.position.y = trunkHeight / 2;
        group.add(trunk);

        const topGeometry = new THREE.ConeGeometry(0.5, topHeight, 4);
        const top = new THREE.Mesh(topGeometry, material);
        top.position.y = trunkHeight + topHeight/2;
        group.add(top);

        group.position.set(x, y, z);
        
        group.userData.height = trunkHeight + topHeight;
        group.userData.width = 1.0;
        
        return group;
    }

    createTreesForChunk(chunkKey) {
        if (this.treeChunks.has(chunkKey)) return;

        const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
        const trees = [];
        for (let i = 0; i < 50; i++) {
            const x = (chunkX * this.chunkSize) + Math.random() * this.chunkSize;
            const z = (chunkZ * this.chunkSize) + Math.random() * this.chunkSize;
            const tree = this.createTree(x, 0, z);
            trees.push(tree);
            this.scene.add(tree);
        }
        this.treeChunks.set(chunkKey, trees);
    }

    checkTreeCollision(position) {
        const characterBox = new THREE.Box3();
        const characterSize = new THREE.Vector3(1, 1.2, 0.8);
        characterBox.setFromCenterAndSize(position, characterSize);

        for (const trees of this.treeChunks.values()) {
            for (const tree of trees) {
                const treeBox = new THREE.Box3();
                const treeHeight = tree.userData.height;
                const treeWidth = tree.userData.width;
                const treePos = tree.position.clone();
                treePos.y += treeHeight / 2;
                const treeSize = new THREE.Vector3(treeWidth, treeHeight, treeWidth);
                treeBox.setFromCenterAndSize(treePos, treeSize);

                if (characterBox.intersectsBox(treeBox)) {
                    return true;
                }
            }
        }
        return false;
    }

    createTreescape() {
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                const chunkKey = `${x},${z}`;
                this.createTreesForChunk(chunkKey);
            }
        }
    }

    getChunkKey(x, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        return `${chunkX},${chunkZ}`;
    }

    setupControls() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        this.lastPosition.copy(this.character.position);

        const rotationSpeed = 0.06;
        const sideSpeed = 0.3;

        const isColliding = this.checkTreeCollision(this.character.position);
        if (isColliding && this.keys['Space']) {
            this.velocity.y = 0.6;
            this.isFlying = true;
        }

        if (this.keys['ArrowUp']) {
            if (this.keys['ArrowLeft']) {
                this.rotation += rotationSpeed;
                this.character.rotation.y += rotationSpeed;
                this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
            }
            if (this.keys['ArrowRight']) {
                this.rotation -= rotationSpeed;
                this.character.rotation.y -= rotationSpeed;
                this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed);
            }
        } else {
            if (this.keys['ArrowLeft']) {
                const moveVec = new THREE.Vector3(-sideSpeed, 0, 0);
                moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                const newPos = this.character.position.clone().add(moveVec);
                if (!this.checkTreeCollision(newPos)) {
                    this.character.position.add(moveVec);
                }
            }
            if (this.keys['ArrowRight']) {
                const moveVec = new THREE.Vector3(sideSpeed, 0, 0);
                moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                const newPos = this.character.position.clone().add(moveVec);
                if (!this.checkTreeCollision(newPos)) {
                    this.character.position.add(moveVec);
                }
            }
        }

        const forwardMove = this.direction.clone().multiplyScalar(this.runningSpeed);
        const newPos = this.character.position.clone().add(forwardMove);
        if (!this.checkTreeCollision(newPos)) {
            this.character.position.add(forwardMove);
        }

        const gravity = 0.015;
        const flyForce = 0.4;
        const maxFlySpeed = 0.8;

        if (!isColliding && this.keys['Space']) {
            this.velocity.y = Math.min(this.velocity.y + flyForce, maxFlySpeed);
            this.isFlying = true;
        } else if (!this.keys['Space']) {
            this.velocity.y = Math.max(this.velocity.y - gravity, -maxFlySpeed);
            this.isFlying = false;
        }

        this.character.position.y += this.velocity.y;
        if (this.character.position.y < this.groundY) {
            this.character.position.y = this.groundY;
            this.velocity.y = 0;
        } else if (this.character.position.y > this.maxFlyHeight) {
            this.character.position.y = this.maxFlyHeight;
            this.velocity.y = 0;
        }

        const runCycle = (Date.now() % 1000) / 1000;
        const legSpeed = this.character.position.y === this.groundY ? 1.5 : 0.3;
        const legAngle = Math.sin(runCycle * Math.PI * 2) * 0.8 * legSpeed;
        
        this.leftLeg.rotation.x = legAngle;
        this.rightLeg.rotation.x = -legAngle;

        const currentChunk = this.getChunkKey(this.character.position.x, this.character.position.z);
        const [currentX, currentZ] = currentChunk.split(',').map(Number);

        for (let x = currentX - 2; x <= currentX + 2; x++) {
            for (let z = currentZ - 2; z <= currentZ + 2; z++) {
                const chunkKey = `${x},${z}`;
                this.createTreesForChunk(chunkKey);
            }
        }

        for (const [chunkKey, trees] of this.treeChunks.entries()) {
            const [x, z] = chunkKey.split(',').map(Number);
            if (Math.abs(x - currentX) > 3 || Math.abs(z - currentZ) > 3) {
                trees.forEach(tree => this.scene.remove(tree));
                this.treeChunks.delete(chunkKey);
            }
        }

        this.ground.position.x = Math.floor(this.character.position.x / 100) * 100;
        this.ground.position.z = Math.floor(this.character.position.z / 100) * 100;

        const cameraHeight = this.character.position.y + 3;
        const cameraDistance = 8 + (this.character.position.y - this.groundY) * 0.5;
        
        const cameraOffset = new THREE.Vector3(0, 0, cameraDistance);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        this.camera.position.x = this.character.position.x + cameraOffset.x;
        this.camera.position.y = cameraHeight;
        this.camera.position.z = this.character.position.z + cameraOffset.z;
        this.camera.lookAt(
            this.character.position.x,
            this.character.position.y + 1,
            this.character.position.z
        );

        this.score = Math.floor(
            Math.sqrt(
                Math.pow(this.character.position.x, 2) + 
                Math.pow(this.character.position.z, 2)
            )
        );
        
        document.getElementById('info').innerHTML = 
            `DREAM RUNNER<br>Left/Right to move, Up + Left/Right to turn<br>Hold SPACE to fly<br>Score: ${this.score}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new BeanBagRunner();
});
import * as THREE from 'three';

export class RunnerCharacter {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.animationTime = 0;
        this.runSpeed = 0.15;
        this.legLength = 0.5;
        this.isJumping = false;
        this.verticalPosition = 0;
        this.jumpForce = 0;
        this.gravity = 0.01;
        
        this.createCharacter();
        this.updateLegs(0);
    }

    createCharacter() {
        // Create main body (square)
        const bodyGeometry = new THREE.PlaneGeometry(1, 1);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            side: THREE.DoubleSide
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.5;
        
        // Create eyes (white backgrounds)
        const eyeGeometry = new THREE.CircleGeometry(0.15, 32);
        const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeBlackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        this.leftEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        this.rightEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        
        // Create pupils
        const pupilGeometry = new THREE.CircleGeometry(0.07, 32);
        this.leftPupil = new THREE.Mesh(pupilGeometry, eyeBlackMaterial);
        this.rightPupil = new THREE.Mesh(pupilGeometry, eyeBlackMaterial);
        
        // Position eyes
        this.leftEyeWhite.position.set(-0.25, 0.1, 0.01);
        this.rightEyeWhite.position.set(0.25, 0.1, 0.01);
        this.leftPupil.position.set(-0.25, 0.1, 0.02);
        this.rightPupil.position.set(0.25, 0.1, 0.02);
        
        // Create legs
        const legMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            linewidth: 2
        });
        
        this.leftLeg = new THREE.Line(new THREE.BufferGeometry(), legMaterial);
        this.rightLeg = new THREE.Line(new THREE.BufferGeometry(), legMaterial);
        
        // Add all parts to the group
        this.group.add(this.body);
        this.group.add(this.leftEyeWhite);
        this.group.add(this.rightEyeWhite);
        this.group.add(this.leftPupil);
        this.group.add(this.rightPupil);
        this.group.add(this.leftLeg);
        this.group.add(this.rightLeg);
        
        // Initial position
        this.group.position.set(0, 0, 0);
    }

    updateLegs(deltaTime) {
        this.animationTime += deltaTime * this.runSpeed;
        
        // Calculate leg positions using sine waves for running animation
        const leftLegAngle = Math.sin(this.animationTime) * 0.5;
        const rightLegAngle = Math.sin(this.animationTime + Math.PI) * 0.5;
        
        // Update left leg geometry
        const leftLegGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(
                Math.sin(leftLegAngle) * this.legLength,
                -this.legLength * Math.cos(leftLegAngle),
                0
            )
        ]);
        
        // Update right leg geometry
        const rightLegGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(
                Math.sin(rightLegAngle) * this.legLength,
                -this.legLength * Math.cos(rightLegAngle),
                0
            )
        ]);
        
        this.leftLeg.geometry.dispose();
        this.rightLeg.geometry.dispose();
        this.leftLeg.geometry = leftLegGeometry;
        this.rightLeg.geometry = rightLegGeometry;
        
        // Position legs relative to body
        this.leftLeg.position.set(-0.25, 1.5, 0);
        this.rightLeg.position.set(0.25, 1.5, 0);
    }

    jump() {
        if (!this.isJumping) {
            this.jumpForce = 0.2;
            this.isJumping = true;
        }
    }

    update(deltaTime) {
        // Update running animation
        this.updateLegs(deltaTime);
        
        // Update jumping
        if (this.isJumping) {
            this.verticalPosition += this.jumpForce;
            this.jumpForce -= this.gravity;
            
            if (this.verticalPosition <= 0) {
                this.verticalPosition = 0;
                this.isJumping = false;
            }
        }
        
        // Update group position for jump height
        this.group.position.y = this.verticalPosition;
        
        // Always face the camera
        if (this.scene.camera) {
            this.group.quaternion.copy(this.scene.camera.quaternion);
        }
    }
}
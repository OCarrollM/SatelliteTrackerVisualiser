import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';

function RotatingGlobe() {
  const meshRef = useRef();
  const earthTexture = useLoader(TextureLoader, '/textures/earthMap.jpg');

  // Rotate the cube on each frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={earthTexture} />
    </mesh>
  );
}

function Background() {
  const backgroundTexture = useLoader(TextureLoader, '/textures/universe.jpg');

  return (
    <mesh>
      <sphereGeometry args={[100, 64, 64]} />
      <meshBasicMaterial map={backgroundTexture} side={2} />
    </mesh>
  )
}

function App() {
  return (
    <Canvas style={{ height: '100vh', backgroundColor: 'black' }}>
      {/* Background */}
      <Background />

      {/* Rotating cube */}
      <RotatingGlobe />

      {/* Lighting */}
      <ambientLight intensity={2} />
      <directionalLight position={[5, 5, 5]} />

      {/* Controls */}
      <OrbitControls />
    </Canvas>
  );
}

export default App;

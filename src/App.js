import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';
import axios from 'axios';
import * as satellite from 'satellite.js';

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

function SatelliteMarkers({ satellites }) {
  const markers = satellites.map((sat, index) => {
    const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
    const positionAndVelocity = satellite.propagate(satrec, new Date());
    const positionEci = positionAndVelocity.position;

    if(!positionEci) return null;

    // Convert esi to long,lat,alt
    const gmst = satellite.gstime(new Date());
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);
    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);

    // conver lat,long to coords
    const radius = 2 + 0.1;
    const x = radius * Math.cos(latitude * (Math.PI / 180)) * Math.cos(longitude * (Math.PI / 180));
    const y = radius * Math.sin(latitude * (Math.PI / 180));
    const z = radius * Math.cos(latitude * (Math.PI / 180)) * Math.sin(longitude * (Math.PI / 180));

    return (
      <mesh key={index} position={[x, y, z]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    );
  });

  return <>{markers}</>
}

function App() {
  const [satellites, setSatellites] = useState([]);

  useEffect(() => {
    // Fetch data
    axios
      .get('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle')
      .then((response) => {
        const tleData = response.data;
        console.log(tleData);
        setSatellites(parseTLE(tleData));
      })
      .catch((error) => console.error('Error fetching data: ', error));
  }, []);

  const parseTLE = (data) => {
    const satellites = [];
    const lines = data.split('\n');

    for(let i = 0; i < lines.length; i += 3) {
      const name = lines[i].trim();
      const line1 = lines[i + 1]?.trim();
      const line2 = lines[i + 2]?.trim();

      if(name && line1 && line2) {
        satellites.push({ name, line1, line2 });
      }
    }

    return satellites;
  };

  return (
    <Canvas style={{ height: '100vh', backgroundColor: 'black' }}>
      {/* Background */}
      <Background />

      {/* Rotating cube */}
      <RotatingGlobe />

      {/* Satellites */}
      <SatelliteMarkers satellites={satellites} />

      {/* Lighting */}
      <ambientLight intensity={2} />
      <directionalLight position={[5, 5, 5]} />

      {/* Controls */}
      <OrbitControls />
    </Canvas>
  );
}

export default App;

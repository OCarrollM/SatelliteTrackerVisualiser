import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

function SatelliteMarkers({ satellites, onSelect }) {
  const { camera, size } = useThree(); // Access the camera
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [visibleSatellites, setVisibleSatellites] = useState([]);
  const [lastCameraDistance, setLastCameraDistance] = useState(0);

  const handleClick = (satellite, position) => {
    const screenPosition = position.clone().project(camera);
    const x = (screenPosition.x * 0.5 + 0.5) * size.width;
    const y = (-screenPosition.y * 0.5 + 0.5) * size.height;

    onSelect(satellite, { x, y });
  };

  useFrame(() => {
    const cameraDistance = camera.position.length(); // Get the camera distance

    // Check if the camera distance has significantly changed
    if (Math.abs(cameraDistance - lastCameraDistance) > 0.1) {
      setLastCameraDistance(cameraDistance); // Update last camera distance

      // Filter satellites based on camera distance
      const filteredSatellites = satellites.filter((_, index) => {
        if (cameraDistance < 5) {
          return index % 10 === 0; // Show every 10th satellite when zoomed in close
        } else if (cameraDistance < 10) {
          return index % 5 === 0; // Show every 5th satellite at medium distance
        } else if (cameraDistance < 20) {
          return index % 2 === 0; // Show every 2nd satellite at further distances
        } else {
          return true; // Show all satellites when zoomed out far
        }
      });

      setVisibleSatellites(filteredSatellites); // Update visible satellites state
    }
  });

  return (
    <>
      {visibleSatellites.map((sat, index) => {
        const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
        const positionAndVelocity = satellite.propagate(satrec, new Date());
        const positionEci = positionAndVelocity.position;

        if (!positionEci) return null;

        const gmst = satellite.gstime(new Date());
        const positionGd = satellite.eciToGeodetic(positionEci, gmst);
        const longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);

        const radius = 2 + 0.1;
        const x = radius * Math.cos(latitude * (Math.PI / 180)) * Math.cos(longitude * (Math.PI / 180));
        const y = radius * Math.sin(latitude * (Math.PI / 180));
        const z = radius * Math.cos(latitude * (Math.PI / 180)) * Math.sin(longitude * (Math.PI / 180));

        return (
          <mesh
            key={index}
            position={[x, y, z]} 
            onClick = {(e) => handleClick(sat, e.object.position)}
          >
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="yellow" />
          </mesh>
        );
      })}
    </>
  );
}

function SatelliteDetails({ satellite, position }) {
  const [tooltipStyle, setTooltipStyle] = useState({});

  useEffect(() => {
    if (position) {
      const { x, y } = position;

      setTooltipStyle({
        position: 'absolute',
        left: `${x + 10}px`,
        top: `${y - 30}px`,
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        transition: 'opacity 0.3s ease',
        opacity: satellite ? 1 : 0,
        pointerEvent: 'none',
      });
    }
  }, [position, satellite]);

  if (!satellite) return null;

  return (
    <div style={tooltipStyle}>
      <strong>{satellite.name}</strong>
      <p>Line 1: {satellite.line1}</p>
      <p>Line 2: {satellite.line2}</p>
    </div>
  );
}


function App() {
  const [satellites, setSatellites] = useState([]);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  const handleSatelliteSelect = (satellite, position) => {
    setSelectedSatellite(satellite);
    setTooltipPosition(position);
  };

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
    <>
      <Canvas style={{ height: '100vh', backgroundColor: 'black' }}>
        {/* Background */}
        <Background />

        {/* Rotating cube */}
        <RotatingGlobe />

        {/* Satellites */}
        <SatelliteMarkers satellites={satellites} onSelect={handleSatelliteSelect} />

        {/* Lighting */}
        <ambientLight intensity={2} />
        <directionalLight position={[5, 5, 5]} />

        {/* Controls */}
        <OrbitControls />
      </Canvas>

      <SatelliteDetails satellite={selectedSatellite} position={tooltipPosition} />
    </>
  );
}

export default App;

'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import Image from 'next/image';
import TitleSection from './title-section';

interface CardProps {
  handleShuffle: () => void;
  imgUrl: string;
  position: string;
  index: number;
}

interface FeatureData {
  title: string;
  description: string;
  imgUrl: string;
}

const ShuffleCards = () => {
  const [order, setOrder] = useState([0, 1, 2]);

  const handleShuffle = () => {
    const orderCopy = [...order];
    orderCopy.unshift(orderCopy.pop()!);
    setOrder(orderCopy);
  };

  const features: FeatureData[] = [
    {
      title: 'Real-time Collaboration',
      description: 'Work together seamlessly with your team in real-time. See changes instantly and communicate effectively.',
      imgUrl: '/cal.png',
    },
    {
      title: 'Smart Organization',
      description: 'Keep your workspace organized with intelligent folder structures and tagging systems.',
      imgUrl: '/cal.png',
    },
    {
      title: 'Powerful Editor',
      description: 'Rich text editing with markdown support, code blocks, and media embeds for comprehensive documentation.',
      imgUrl: '/cal.png',
    },
  ];

  // Get the current front card
  const frontCardIndex = order[0];
  const currentFeature = features[frontCardIndex];

  return (
    <div className="w-full">
      <TitleSection
        title={currentFeature.title}
        subheading={currentFeature.description}
        pill="Features"
      />
      <div className="grid place-content-center overflow-hidden px-4 py-12 md:px-8 md:py-24">
        <div className="relative -ml-[100px] h-[400px] w-[350px] sm:-ml-[150px] sm:h-[500px] sm:w-[450px] md:-ml-[200px] md:h-[600px] md:w-[550px] lg:-ml-[300px] lg:h-[700px] lg:w-[600px]">
          {order.map((featureIndex, positionIndex) => (
            <Card
              key={featureIndex}
              imgUrl={features[featureIndex].imgUrl}
              handleShuffle={handleShuffle}
              position={
                positionIndex === 0
                  ? 'front'
                  : positionIndex === 1
                  ? 'middle'
                  : 'back'
              }
              index={featureIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Card = ({ handleShuffle, imgUrl, position, index }: CardProps) => {
  const mousePosRef = useRef(0);

  const onDragStart = (e: any) => {
    mousePosRef.current = e.clientX;
  };

  const onDragEnd = (e: any) => {
    const diff = mousePosRef.current - e.clientX;

    if (diff > 150) {
      handleShuffle();
    }

    mousePosRef.current = 0;
  };

  const x = position === 'front' ? '0%' : position === 'middle' ? '33%' : '66%';
  const rotateZ =
    position === 'front' ? '-6deg' : position === 'middle' ? '0deg' : '6deg';
  const zIndex = position === 'front' ? '2' : position === 'middle' ? '1' : '0';

  const draggable = position === 'front';

  return (
    <motion.div
      style={{
        zIndex,
      }}
      animate={{ rotate: rotateZ, x }}
      drag
      dragElastic={0.35}
      dragListener={draggable}
      dragConstraints={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      transition={{
        duration: 0.35,
      }}
      className={`absolute left-0 top-0 h-[400px] w-[350px] sm:h-[500px] sm:w-[450px] md:h-[600px] md:w-[550px] lg:h-[700px] lg:w-[600px] select-none rounded-2xl border-2 border-washed-purple-300/20 bg-background/80 shadow-xl backdrop-blur-md p-4 sm:p-5 md:p-6 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="relative w-full h-full overflow-hidden rounded-xl">
        <Image
          src={imgUrl}
          alt={`Feature ${index + 1}`}
          fill
          className="pointer-events-none object-contain"
        />
      </div>
    </motion.div>
  );
};

export default ShuffleCards;

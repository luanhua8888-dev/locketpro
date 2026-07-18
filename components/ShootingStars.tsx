import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface StarProps {
  id: number;
  onComplete: (id: number) => void;
}

const ShootingStar = ({ id, onComplete }: StarProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Randomize starting position
  // We want it to start from the top or right side and move left-down
  const isTop = Math.random() > 0.5;
  const startX = useRef(isTop ? Math.random() * width : width + 50).current;
  const startY = useRef(isTop ? -50 : Math.random() * (height / 2)).current;
  
  // Random distance and duration
  const distance = useRef(Math.random() * 400 + 400).current;
  const duration = useRef(Math.random() * 1500 + 1500).current;
  
  // Angle for falling left-down is around 45 degrees
  // But wait, if it rotates -45 degrees, its X axis points top-left.
  // Actually, if we just translate X positive, it goes right.
  // To go left-down, if we don't rotate, translateX=-dist, translateY=dist.
  // Let's use a 45 degree angle.
  // So we translate X only, and rotate by 135 degrees? No, simpler to just use translateX/Y.

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onComplete(id);
    });
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -distance], // move left
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, distance], // move down
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Scale the tail as it flies
  const scaleX = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.starContainer,
        {
          left: startX,
          top: startY,
          opacity: opacity,
          transform: [
            { translateX },
            { translateY },
            // Rotate so the tail points behind the movement
            // Moving left and down means angle is 135 degrees.
            // A horizontal line with tail on right, head on left, points left.
            // If we rotate it by 45 degrees counter-clockwise (-45deg), it points left-down.
            { rotate: '-45deg' },
          ],
        },
      ]}
    >
      <View style={styles.starHead} />
      <Animated.View style={{ transform: [{ scaleX }], transformOrigin: 'left' } as any}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.8)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.starTail}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default function ShootingStars() {
  const [stars, setStars] = useState<{ id: number }[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const spawnStar = () => {
      setStars((prev) => [...prev, { id: nextId.current++ }]);
      // Schedule next star between 4 to 12 seconds
      const nextDelay = Math.random() * 8000 + 4000;
      timeoutId = setTimeout(spawnStar, nextDelay);
    };

    // First star appears after 2 seconds
    timeoutId = setTimeout(spawnStar, 2000);

    return () => clearTimeout(timeoutId);
  }, []);

  const removeStar = (id: number) => {
    setStars((prev) => prev.filter((star) => star.id !== id));
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star) => (
        <ShootingStar key={star.id} id={star.id} onComplete={removeStar} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999, // Ensure it's on top of everything
    elevation: 999,
  },
  starContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
  },
  starHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  starTail: {
    width: 150,
    height: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});

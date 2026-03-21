export const spring = { type: 'spring', stiffness: 400, damping: 30 };
export const springGentle = { type: 'spring', stiffness: 280, damping: 32 };
export const easeSnappy = [0.4, 0, 0.2, 1];

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.2, ease: easeSnappy },
};

export const slideRight = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -4 },
  transition: { duration: 0.2, ease: easeSnappy },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15, ease: easeSnappy },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

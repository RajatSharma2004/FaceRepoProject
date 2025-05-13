/**
 * Calculate the Euclidean distance between two face descriptors
 * @param {number[]} descriptor1 First face descriptor
 * @param {number[]} descriptor2 Second face descriptor
 * @returns {number} Distance between the descriptors
 */
const compareFaceDescriptors = (descriptor1, descriptor2) => {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Face descriptors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

module.exports = {
  compareFaceDescriptors,
}; 
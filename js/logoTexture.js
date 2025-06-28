window.addEventListener('DOMContentLoaded', () => {
  const texture = document.getElementById('logo-texture');
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const logoWidth = 1813;
  const logoHeight = 1418;

  const randomX = Math.random() * vw * 1.30;
  const randomY = Math.random() * vh * 1.30;

  const randomOpacity = 0.15 + Math.random() * 0.35; // 0.15 - 0.5
  const randomScale = 0.7 + Math.random() * 0.5;     // 0.7 - 1.2

  texture.style.left = `${randomX - logoWidth / 2}px`;
  texture.style.top = `${randomY - logoHeight / 2}px`;
  texture.style.opacity = randomOpacity.toFixed(2);
  texture.style.transform = `scale(${randomScale.toFixed(2)})`;
});
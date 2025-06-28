window.addEventListener('DOMContentLoaded', () => {
  const texture = document.getElementById('logo-texture');
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const logoWidth = 1813;
  const logoHeight = 1418;

  const randomX = Math.random() * vw;
  const randomY = Math.random() * vh;

  // Colocamos el centro en (randomX, randomY)
  texture.style.left = `${randomX - logoWidth / 2}px`;
  texture.style.top = `${randomY - logoHeight / 2}px`;
});
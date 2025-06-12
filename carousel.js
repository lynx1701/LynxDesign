// GSAP Carousel with three images in a row
const images = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
];

const carousel = document.getElementById('gsap-carousel');
const imagesRow = document.getElementById('carousel-images-row');
const prevBtn = document.getElementById('gsap-carousel-prev');
const nextBtn = document.getElementById('gsap-carousel-next');
let current = 0;
let timer = null;
let isAnimating = false;
const visibleCount = 5; // Number of images to show at once (should be odd for centering)
const imgWidth = 120; // width in px (should match CSS for .carousel-img)
const gap = 0; // px gap between images

function renderImages() {
  imagesRow.innerHTML = '';
  images.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'carousel-img';
    img.style.width = imgWidth + 'px';
    img.style.height = '100px';
    img.style.margin = '0 ' + (gap/2) + 'px';
    img.dataset.idx = i;
    imagesRow.appendChild(img);
  });
}

function updateHighlight() {
  // Remove all highlights
  imagesRow.querySelectorAll('.carousel-img').forEach(img => img.classList.remove('center'));
  // Highlight the centered image
  const imgs = imagesRow.querySelectorAll('.carousel-img');
  const centerIdx = (current + Math.floor(visibleCount/2)) % images.length;
  imgs.forEach((img, i) => {
    if (parseInt(img.dataset.idx) === current) {
      img.classList.add('center');
      img.style.width = '220px';
      img.style.height = '160px';
      img.style.zIndex = '2';
      img.style.opacity = '1';
    } else {
      img.classList.remove('center');
      img.style.width = imgWidth + 'px';
      img.style.height = '100px';
      img.style.zIndex = '1';
      img.style.opacity = '0.7';
    }
  });
}

function slideTo(idx, direction = 1) {
  if (isAnimating) return;
  isAnimating = true;
  const offset = -((idx) * (imgWidth + gap) - ((visibleCount-1)/2) * (imgWidth + gap));
  gsap.to(imagesRow, {
    x: offset,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => {
      current = idx;
      updateHighlight();
      isAnimating = false;
    }
  });
}

function nextImage() {
  if (isAnimating) return;
  const newIdx = (current + 1) % images.length;
  slideTo(newIdx, 1);
}

function prevImage() {
  if (isAnimating) return;
  const newIdx = (current - 1 + images.length) % images.length;
  slideTo(newIdx, -1);
}

nextBtn.addEventListener('click', nextImage);
prevBtn.addEventListener('click', prevImage);

// Auto play
// timer = setInterval(nextImage, 3500);

// Pause on hover
carousel.addEventListener('mouseenter', () => clearInterval(timer));
carousel.addEventListener('mouseleave', () => timer = setInterval(nextImage, 3500));

// Init
renderImages();
updateHighlight();
// Center the row on load
const initialOffset = -((current) * (imgWidth + gap) - ((visibleCount-1)/2) * (imgWidth + gap));
gsap.set(imagesRow, { x: initialOffset });

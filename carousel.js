// GSAP Carousel with three images in a row

/**
 * 1. Bug when clicking on the images row, not moving left or right
 * 2. Arrows dont move
 * 3. Unable to select a new image
 * 4. If I move too much to the left or right, I reach a white zone.
 */

// DOM Elements
let carousel, imagesRow, prevBtn, nextBtn, playPauseBtn, fullscreenOverlay, fullscreenImg;

// State variables
let current = 0;
let timer = null;
let isAnimating = false;
let isPlaying = true;

// Constants
const visibleCount = 5; // Number of images to show at once (should be odd for centering)
const imgWidth = 150; // width in px for side images
const centerImgWidth = 280; // width in px for center image
const gap = 20; // px gap between images
const autoPlayInterval = 3000; // 3 seconds between auto-advance

// Image URLs
const images = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
  'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800',
  'https://images.unsplash.com/photo-1540202403-312d3366ae7f?w=800',
  'https://images.unsplash.com/photo-1526336023234-3a10942ed150?w=800'
];

function renderImages() {
  imagesRow.innerHTML = '';
  
  // Clone images for infinite loop effect
  var extendedImages = images.concat(images).concat(images);
  var startIdx = images.length - Math.floor(visibleCount / 2);
  
  for (var i = 0; i < extendedImages.length; i++) {
    var img = document.createElement('img');
    img.src = extendedImages[i];
    img.className = 'carousel-img';
    img.style.width = imgWidth + 'px';
    img.style.height = '120px';
    img.style.margin = '0 ' + (gap/2) + 'px';
    img.dataset.idx = i % images.length;
    img.dataset.originalIdx = i;
    
    // Add click handler to center image or open fullscreen
    img.addEventListener('click', function() {
      if (this.classList.contains('center')) {
        // If already centered, open fullscreen
        openFullscreen(this.src);
      } else {
        // Otherwise, center this image
        var containerWidth = imagesRow.parentElement.offsetWidth;
        var imgRect = this.getBoundingClientRect();
        var containerRect = imagesRow.parentElement.getBoundingClientRect();
        var imgCenter = imgRect.left + imgRect.width/2;
        var containerCenter = containerRect.left + containerRect.width/2;
        var offset = imgCenter - containerCenter;
        
        // Calculate the new position to center the clicked image
        var currentX = gsap.getProperty(imagesRow, 'x');
        var targetX = currentX - offset;
        
        // Animate to the new position
        gsap.to(imagesRow, {
          x: targetX,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: updateHighlight
        });
      }
    });
    
    imagesRow.appendChild(img);
  }
  
  // Set initial position
  var initialOffset = -(startIdx * (imgWidth + gap) - ((visibleCount-1)/2 * (imgWidth + gap)));
  gsap.set(imagesRow, { x: initialOffset });
  
  // Update highlights
  updateHighlight();
}

function updateHighlight() {
  var imgs = imagesRow.querySelectorAll('.carousel-img');
  var centerIdx = Math.floor(visibleCount / 2);
  var containerRect = imagesRow.parentElement.getBoundingClientRect();
  var containerCenter = containerRect.left + containerRect.width / 2;
  
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    var imgRect = img.getBoundingClientRect();
    var imgCenter = imgRect.left + imgRect.width / 2;
    
    // Check if image is in center (with 20px threshold)
    if (Math.abs(imgCenter - containerCenter) < 20) {
      // This is the center image
      if (!img.classList.contains('center')) {
        img.classList.add('center');
        // Slightly enlarge the center image
        img.style.width = (centerImgWidth * 1.05) + 'px';
        img.style.height = '210px';
        img.style.zIndex = '2';
        img.style.opacity = '1';
        img.style.transition = 'all 0.3s ease';
        img.style.cursor = 'zoom-in';
      }
      
      // Update current index
      current = parseInt(img.dataset.idx);
    } else {
      // This is not the center image
      if (img.classList.contains('center')) {
        img.classList.remove('center');
        img.style.width = imgWidth + 'px';
        img.style.height = '120px';
        img.style.zIndex = '1';
        img.style.opacity = '0.6';
        img.style.transition = 'all 0.3s ease';
        img.style.cursor = 'pointer';
      }
    }
  }
  
  // Check if we need to loop
  checkLoop();
}

function slideTo(idx, direction) {
  if (isAnimating) return;
  isAnimating = true;
  
  // Calculate the new position
  var targetPosition = -(idx * (imgWidth + gap) - ((visibleCount-1)/2 * (imgWidth + gap)));
  
  gsap.to(imagesRow, {
    x: targetPosition,
    duration: 0.8,
    ease: 'power2.inOut',
    onComplete: function() {
      updateHighlight();
      isAnimating = false;
    }
  });
}

function nextImage() {
  if (isAnimating || !imagesRow) return;
  var currentPosition = gsap.getProperty(imagesRow, 'x');
  var targetIndex = Math.round(-currentPosition / (imgWidth + gap)) + 1;
  slideTo(targetIndex, 1);
}

function prevImage() {
  if (isAnimating || !imagesRow) return;
  var currentPosition = gsap.getProperty(imagesRow, 'x');
  var targetPosition = currentPosition + (imgWidth + gap) - 1;
  
  gsap.to(imagesRow, {
    x: targetPosition,
    duration: 0.8,
    ease: 'power2.inOut',
    onComplete: updateHighlight
  });
}

function checkLoop() {
  var imgs = imagesRow.querySelectorAll('.carousel-img');
  var firstImg = imgs[0];
  var lastImg = imgs[imgs.length - 1];
  var firstRect = firstImg.getBoundingClientRect();
  var lastRect = lastImg.getBoundingClientRect();
  var containerRect = carousel.getBoundingClientRect();
  
  // If we've scrolled too far right (showing first images), jump to the middle section
  if (firstRect.right > containerRect.right) {
    var jumpPos = gsap.getProperty(imagesRow, 'x') + (images.length * (imgWidth + gap));
    gsap.set(imagesRow, { x: jumpPos });
  }
  // If we've scrolled too far left (showing last images), jump to the middle section
  else if (lastRect.left < containerRect.left) {
    var jumpPos = gsap.getProperty(imagesRow, 'x') - (images.length * (imgWidth + gap));
    gsap.set(imagesRow, { x: jumpPos });
  }
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  var icon = playPauseBtn.querySelector('i');
  
  if (isPlaying) {
    icon.className = 'fas fa-pause';
    startAutoPlay();
  } else {
    icon.className = 'fas fa-play';
    stopAutoPlay();
  }
}

function startAutoPlay() {
  stopAutoPlay();
  if (isPlaying) {
    timer = setInterval(nextImage, autoPlayInterval);
  }
}

function stopAutoPlay() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// Fullscreen functions
function openFullscreen(src) {
  if (!fullscreenImg || !fullscreenOverlay) return;
  
  fullscreenImg.src = src;
  fullscreenOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  
  // Close fullscreen when clicking the overlay
  fullscreenOverlay.onclick = function(e) {
    if (e.target === fullscreenOverlay) {
      closeFullscreen();
    }
  };
  
  // Close with Escape key
  document.addEventListener('keydown', handleFullscreenKeydown);
}

function closeFullscreen() {
  if (!fullscreenOverlay) return;
  
  fullscreenOverlay.style.display = 'none';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  
  // Remove the event listener
  document.removeEventListener('keydown', handleFullscreenKeydown);
}

function handleFullscreenKeydown(e) {
  if (e.key === 'Escape') {
    closeFullscreen();
  }
}

// Initialize event listeners
function initEventListeners() {
  // Get DOM elements
  carousel = document.getElementById('gsap-carousel');
  imagesRow = document.getElementById('carousel-images-row');
  prevBtn = document.getElementById('gsap-carousel-prev');
  nextBtn = document.getElementById('gsap-carousel-next');
  playPauseBtn = document.getElementById('carousel-play-pause');
  fullscreenOverlay = document.getElementById('fullscreen-overlay');
  fullscreenImg = document.getElementById('fullscreen-img');

  // Navigation buttons - use arrow functions to maintain 'this' context
  if (prevBtn) prevBtn.addEventListener('click', () => prevImage());
  if (nextBtn) nextBtn.addEventListener('click', () => nextImage());
  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
  
  // Set cursor to pointer for center image clicks
  if (imagesRow) {
    imagesRow.style.cursor = 'pointer';
  }
  
  // Pause on hover
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', function() {
      if (isPlaying) startAutoPlay();
    });
  }

  // Handle keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    } else if (e.key === 'Escape') {
      closeFullscreen();
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlayPause();
    }
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateHighlight, 250);
  });
}

// Initialize the carousel when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners
  initEventListeners();
  
  // Start the carousel
  renderImages();
  startAutoPlay();
});

// ============================================
// INTERACTIVE COMPONENTS LIBRARY
// ============================================

/**
 * Accordion Component
 */
class Accordion {
  constructor(element) {
    this.accordion = element;
    this.items = this.accordion.querySelectorAll('.accordion-item');
    this.init();
  }

  init() {
    this.items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      const content = item.querySelector('.accordion-content');
      
      header.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Close all items if you want only one open at a time
        // this.items.forEach(i => i.classList.remove('active'));
        
        if (isOpen) {
          item.classList.remove('active');
          content.style.maxHeight = null;
        } else {
          item.classList.add('active');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  }
}

/**
 * Lightbox/Modal Manager
 */
class Lightbox {
  constructor() {
    this.createLightbox();
  }

  createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox hidden';
    lightbox.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close">&times;</button>
        <div class="lightbox-inner"></div>
        <button class="lightbox-prev" aria-label="Previous">&#8249;</button>
        <button class="lightbox-next" aria-label="Next">&#8250;</button>
      </div>
    `;
    document.body.appendChild(lightbox);

    this.lightbox = lightbox;
    this.inner = lightbox.querySelector('.lightbox-inner');
    this.items = [];
    this.currentIndex = 0;

    // Event listeners
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.close());
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.close());
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.prev());
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.next());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === 'ArrowRight') this.next();
      }
    });
  }

  open(items, startIndex = 0) {
    this.items = items;
    this.currentIndex = startIndex;
    this.show(this.currentIndex);
    this.lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  show(index) {
    const item = this.items[index];
    if (item.type === 'image') {
      this.inner.innerHTML = `<img src="${item.src}" alt="${item.alt || ''}" style="max-width: 100%; max-height: 80vh;">`;
    } else if (item.type === 'video') {
      this.inner.innerHTML = `<video controls style="max-width: 100%; max-height: 80vh;"><source src="${item.src}"></video>`;
    }
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.show(this.currentIndex);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.show(this.currentIndex);
  }
}

/**
 * Tooltip System
 */
class Tooltip {
  constructor() {
    this.tooltip = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip-popup hidden';
    document.body.appendChild(this.tooltip);

    // Find all elements with data-tooltip
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.show(target, target.dataset.tooltip);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.hide();
      }
    });
  }

  show(element, text) {
    this.tooltip.textContent = text;
    this.tooltip.classList.remove('hidden');

    const rect = element.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;

    // Adjust if tooltip goes off screen
    if (top < 0) {
      top = rect.bottom + 10;
    }
    if (left < 0) {
      left = 10;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    this.tooltip.style.top = top + window.scrollY + 'px';
    this.tooltip.style.left = left + window.scrollX + 'px';
  }

  hide() {
    this.tooltip.classList.add('hidden');
  }
}

/**
 * Toast Notification Manager
 */
class Toast {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fadeInRight`;
    
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    this.container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toast));

    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  remove(toast) {
    toast.classList.remove('animate-fadeInRight');
    toast.classList.add('animate-fadeOutRight');
    setTimeout(() => toast.remove(), 300);
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

/**
 * Progress Tracker
 */
class ProgressTracker {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      max: options.max || 100,
      value: options.value || 0,
      showPercentage: options.showPercentage !== false,
      animated: options.animated !== false
    };
    this.init();
  }

  init() {
    this.element.classList.add('progress-tracker');
    this.bar = document.createElement('div');
    this.bar.className = 'progress-bar';
    this.element.appendChild(this.bar);

    if (this.options.showPercentage) {
      this.label = document.createElement('span');
      this.label.className = 'progress-label';
      this.element.appendChild(this.label);
    }

    this.update(this.options.value);
  }

  update(value) {
    this.value = Math.min(Math.max(value, 0), this.options.max);
    const percentage = (this.value / this.options.max) * 100;
    
    if (this.options.animated) {
      this.bar.style.transition = 'width 0.3s ease';
    }
    
    this.bar.style.width = percentage + '%';
    
    if (this.label) {
      this.label.textContent = Math.round(percentage) + '%';
    }
  }

  getValue() {
    return this.value;
  }

  reset() {
    this.update(0);
  }
}

/**
 * Scroll Animation Observer
 */
class ScrollAnimationObserver {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px',
      animationClass: options.animationClass || 'animate-fadeInUp'
    };
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(this.options.animationClass);
          if (entry.target.dataset.animateOnce !== 'false') {
            observer.unobserve(entry.target);
          }
        } else {
          if (entry.target.dataset.animateOnce === 'false') {
            entry.target.classList.remove(this.options.animationClass);
          }
        }
      });
    }, {
      threshold: this.options.threshold,
      rootMargin: this.options.rootMargin
    });

    // Observe all elements with data-animate attribute
    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });

    return observer;
  }
}

/**
 * Lazy Loading Handler
 */
class LazyLoader {
  constructor() {
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      observer.observe(img);
    });

    return observer;
  }
}

/**
 * Smooth Scroll Handler
 */
class SmoothScroll {
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 800,
      offset: options.offset || 0
    };
    this.init();
  }

  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          this.scrollTo(target);
        }
      });
    });
  }

  scrollTo(element) {
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - this.options.offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const scroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.options.duration, 1);
      const easing = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition + distance * easing);

      if (progress < 1) {
        requestAnimationFrame(scroll);
      }
    };

    requestAnimationFrame(scroll);
  }
}

/**
 * Typing Effect
 */
class TypeWriter {
  constructor(element, options = {}) {
    this.element = element;
    this.texts = options.texts || [element.textContent];
    this.speed = options.speed || 100;
    this.deleteSpeed = options.deleteSpeed || 50;
    this.pause = options.pause || 2000;
    this.loop = options.loop !== false;
    this.currentText = 0;
    this.currentChar = 0;
    this.isDeleting = false;
    this.element.textContent = '';
    this.type();
  }

  type() {
    const fullText = this.texts[this.currentText];

    if (!this.isDeleting && this.currentChar <= fullText.length) {
      this.element.textContent = fullText.substring(0, this.currentChar);
      this.currentChar++;
      setTimeout(() => this.type(), this.speed);
    } else if (this.isDeleting && this.currentChar >= 0) {
      this.element.textContent = fullText.substring(0, this.currentChar);
      this.currentChar--;
      setTimeout(() => this.type(), this.deleteSpeed);
    } else if (!this.isDeleting && this.currentChar > fullText.length) {
      setTimeout(() => {
        this.isDeleting = true;
        this.type();
      }, this.pause);
    } else if (this.isDeleting && this.currentChar < 0) {
      this.isDeleting = false;
      this.currentText = (this.currentText + 1) % this.texts.length;
      if (this.currentText === 0 && !this.loop) {
        return;
      }
      setTimeout(() => this.type(), 500);
    }
  }
}

/**
 * Debounce Utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle Utility
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Accordion,
    Lightbox,
    Tooltip,
    Toast,
    ProgressTracker,
    ScrollAnimationObserver,
    LazyLoader,
    SmoothScroll,
    TypeWriter,
    debounce,
    throttle
  };
}

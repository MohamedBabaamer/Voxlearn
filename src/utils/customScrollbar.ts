import { OverlayScrollbars, type OverlayScrollbars as OverlayScrollbarsInstance } from 'overlayscrollbars';

const INIT_SELECTOR = '[class*="overflow-y-auto"], [class*="overflow-auto"], [data-custom-scrollbar="true"]';

const instances = new WeakMap<HTMLElement, OverlayScrollbarsInstance>();
let observer: MutationObserver | null = null;
let scheduled = false;

const initScrollbars = () => {
  try {
    const elements = document.querySelectorAll<HTMLElement>(INIT_SELECTOR);

    elements.forEach((element) => {
      if (!element || !element.offsetHeight || instances.has(element)) {
        return;
      }

      try {
        const instance = OverlayScrollbars(element, {
          overflow: {
            x: 'hidden',
            y: 'scroll'
          },
          scrollbars: {
            theme: 'os-theme-voxlearn',
            visibility: 'auto',
            autoHide: 'never',
            autoHideSuspend: false,
            autoHideDelay: 300,
            dragScroll: true,
            clickScroll: true,
            pointers: ['mouse', 'touch', 'pen']
          }
        });

        instances.set(element, instance);
      } catch (err) {
        console.warn('Failed to init scrollbar on element:', err);
      }
    });
  } catch (err) {
    console.warn('Error during scrollbar initialization:', err);
  }
};

const scheduleInit = () => {
  if (scheduled) {
    return;
  }

  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    initScrollbars();
  });
};

export const setupCustomScrollbars = () => {
  scheduleInit();

  if (!observer) {
    observer = new MutationObserver(() => {
      scheduleInit();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
};

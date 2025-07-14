export class MobileMenuManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggleButton = document.getElementById('mobile-menu-toggle');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        if (!this.toggleButton || !this.sidebar || !this.overlay) {
            return;
        }

        this.setupEventListeners();
        this.handleResize();
        
        // Listen for window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupEventListeners() {
        // Toggle button
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Overlay click
        this.overlay.addEventListener('click', () => {
            this.close();
        });

        // Close on navigation link click
        this.sidebar.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Prevent sidebar clicks from closing menu
        this.sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.sidebar.classList.add('open');
        this.overlay.classList.add('active');
        this.toggleButton.innerHTML = '✕';
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.sidebar.classList.remove('open');
        this.overlay.classList.remove('active');
        this.toggleButton.innerHTML = '☰';
        this.isOpen = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    handleResize() {
        // Close menu on desktop
        if (window.innerWidth >= 1024) {
            this.close();
        }
    }
}
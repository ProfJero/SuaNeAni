// Site header (navigation) and footer, shared by every page.
//
// Each page has <div id="header-component"></div> at the top and
// <div id="footer-component"></div> at the bottom, followed by
// <script src="js/layout.js"></script>. This script fills both in straight
// away, without loading other files, so the menu and footer always appear
// (on any web host, and also when a page is opened directly from disk).
//
// To change the menu or footer, edit HEADER_HTML / FOOTER_HTML below.
(function () {
  var HEADER_CSS = `
  /* mobile slide-in menu */
  .mobile-menu-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    backdrop-filter: blur(4px);
  }
  .mobile-menu-overlay.open {
    opacity: 1;
    visibility: visible;
  }
  .mobile-menu-panel {
    position: fixed;
    top: 0;
    right: -320px;
    width: 300px;
    max-width: 80vw;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 110;
    padding: 2rem 1.5rem;
    transition: right 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: -8px 0 30px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .mobile-menu-panel.open {
    right: 0;
  }
  .mobile-menu-panel .close-btn {
    align-self: flex-end;
    font-size: 1.8rem;
    color: #1e293b;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0 0.5rem;
  }
  .mobile-menu-panel a {
    font-weight: 500;
    color: #1e293b;
    padding: 0.6rem 0.8rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: background 0.15s;
    font-size: 1rem;
  }
  .mobile-menu-panel a:hover {
    background: #fef3c7;
    color: #d97706;
  }
  .mobile-menu-panel a i {
    width: 1.5rem;
    color: #f5a623;
  }
  .mobile-menu-panel .donate-mobile {
    margin-top: auto;
    background: #f5a623;
    color: white !important;
    border-radius: 40px;
    justify-content: center;
    padding: 0.9rem;
    font-weight: 600;
  }
  .mobile-menu-panel .donate-mobile i {
    color: white;
  }
  .mobile-menu-panel .donate-mobile:hover {
    background: #d97706;
  }
  body.no-scroll { overflow: hidden; }
  
  /* Active nav link styling */
  .nav-link-active {
    color: #F5A623 !important;
    border-bottom: 2px solid #F5A623;
    padding-bottom: 0.25rem;
  }
  .nav-link-inactive {
    color: #4B5563 !important;
    border-bottom: 2px solid transparent;
    padding-bottom: 0.25rem;
  }
  .nav-link-inactive:hover {
    color: #F5A623 !important;
  }
  
  /* Mobile active link styling */
  .mobile-link-active {
    color: #F5A623 !important;
    font-weight: 600 !important;
    background-color: #fef3c7 !important;
  }
  .mobile-link-inactive {
    color: #1e293b !important;
    font-weight: 500 !important;
    background-color: transparent !important;
  }

  /* ===== GLASS HEADER STYLES ===== */
  .glass-header {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 9999 !important;
    
    background: rgba(255, 255, 255, 0.72) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
    
    border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
    box-shadow: 
      0 4px 30px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
    
    transition: all 0.3s ease !important;
    transform: translateZ(0) !important;
    will-change: transform !important;
  }

  .glass-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.1) 100%
    );
    pointer-events: none;
    z-index: -1;
  }

  .header-container {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .header-container {
      padding: 0.5rem 1rem;
    }
  }

  .brand-text {
    color: #F5A623 !important;
    font-weight: 700 !important;
    letter-spacing: -0.5px !important;
  }

  .brand-text:hover {
    color: #E0951A !important;
  }

  .glass-mobile-menu {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(24px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
  }

  .donate-btn-glass {
    background: linear-gradient(135deg, #F5A623, #E0951A) !important;
    color: white !important;
    padding: 0.5rem 1.25rem !important;
    border-radius: 9999px !important;
    font-weight: 700 !important;
    font-size: 0.875rem !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 15px rgba(245, 166, 35, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
  }

  .donate-btn-glass:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(245, 166, 35, 0.4) !important;
    background: linear-gradient(135deg, #E0951A, #D4880F) !important;
  }

  .glass-nav-link {
    position: relative;
    padding: 0.25rem 0.5rem;
    transition: all 0.3s ease;
    border-radius: 8px;
  }

  .glass-nav-link:hover {
    background: rgba(245, 166, 35, 0.08);
    backdrop-filter: blur(4px);
  }

  .hamburger-btn {
    background: rgba(255, 255, 255, 0.5) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    border-radius: 12px !important;
    padding: 0.5rem 0.75rem !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    transition: all 0.3s ease !important;
  }

  .hamburger-btn:hover {
    background: rgba(255, 255, 255, 0.8) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
  }

  body {
    padding-top: 80px !important;
  }

  @media (max-width: 768px) {
    body {
      padding-top: 72px !important;
    }
  }

  /* ===== DROPDOWN STYLES (only for Partners) ===== */
  .dropdown-group {
    position: relative;
  }
  .dropdown-menu {
    position: absolute;
    left: 0;
    margin-top: 0.5rem;
    width: 220px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0.5rem 0;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: all 0.2s ease;
    z-index: 999;
  }
  .dropdown-group:hover .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .dropdown-menu a {
    display: block;
    padding: 0.5rem 1rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.15s;
    border-bottom: none !important;
  }
  .dropdown-menu a:hover {
    background: #fef3c7;
    color: #d97706;
  }
  .dropdown-trigger {
    cursor: default;
  }
  .dropdown-trigger i {
    font-size: 10px;
    margin-left: 4px;
    transition: transform 0.2s;
  }
  .dropdown-group:hover .dropdown-trigger i {
    transform: rotate(180deg);
  }
  .dropdown-menu.wide {
    width: 260px;
  }
`;

  var HEADER_HTML = `
  <!-- MOBILE MENU OVERLAY -->
  <div id="mobile-overlay" class="mobile-menu-overlay"></div>

  <!-- MOBILE MENU PANEL -->
  <div id="mobile-panel" class="mobile-menu-panel glass-mobile-menu">
    <button id="close-mobile" class="close-btn"><i class="fas fa-times"></i></button>
    <div class="flex items-center gap-2 border-b border-gray-100/50 pb-4 mb-1">
      <img alt="Logo" class="w-8" src="images/logo.png">
      <span class="text-xl font-bold text-orange-900">suaneani</span>
    </div>
    <a href="index.html" data-page="home" class="mobile-link-inactive"><i class="fas fa-home"></i> Home</a>
    <a href="about.html" data-page="about" class="mobile-link-inactive"><i class="fas fa-info-circle"></i> About</a>
    <a href="programs.html" data-page="programs" class="mobile-link-inactive"><i class="fas fa-th-large"></i> Programs</a>
    <a href="impact.html" data-page="impact" class="mobile-link-inactive"><i class="fas fa-chart-line"></i> Impact</a>
    <!-- Gallery & News: uncomment to show in the menu -->
    <!-- <a href="gallery.html" data-page="gallery" class="mobile-link-inactive"><i class="fas fa-images"></i> Gallery</a> -->
    <!-- <a href="news.html" data-page="news" class="mobile-link-inactive"><i class="fas fa-newspaper"></i> News</a> -->
    <!-- <a href="get-involved.html" data-page="get-involved" class="mobile-link-inactive"><i class="fas fa-hand-holding-heart"></i> Get Involved</a> -->

    <!-- Partner pages on mobile -->
    <a href="partners-development.html" class="mobile-link-inactive"><i class="fas fa-handshake"></i> Development Partners</a>
    <a href="partners-education.html" class="mobile-link-inactive"><i class="fas fa-school"></i> Education Partners</a>
    <a href="partners-publishers.html" class="mobile-link-inactive"><i class="fas fa-book"></i> Publishers</a>
    <a href="partners-technology.html" class="mobile-link-inactive"><i class="fas fa-microchip"></i> Tech Partners</a>

    <a href="contact.html" data-page="contact" class="mobile-link-inactive"><i class="fas fa-envelope"></i> Contact</a>
    <!-- Donate hidden until payment is connected -->
    <a href="donate.html" class="donate-mobile" style="display:none"><i class="fas fa-heart"></i> Donate</a>
  </div>

  <!-- MAIN HEADER -->
  <header id="main-header" class="glass-header">
    <div class="header-container">
      <div class="flex items-center space-x-2">
        <a href="index.html">
          <img alt="Sua Ne Ani Logo" class="h-10 w-auto" src="images/logo.png">
        </a>
        <a href="index.html" class="text-2xl font-bold brand-text">suaneani</a>
      </div>

      <!-- DESKTOP NAV -->
      <nav class="hidden md:flex items-center space-x-6 text-sm font-semibold" id="main-nav">
        <a href="index.html" data-page="home" class="nav-link-inactive glass-nav-link">Home</a>
        <a href="about.html" data-page="about" class="nav-link-inactive glass-nav-link">About</a>
        <a href="programs.html" data-page="programs" class="nav-link-inactive glass-nav-link">Programs</a>

        <!-- Impact (simple link – dropdown removed) -->
        <a href="impact.html" data-page="impact" class="nav-link-inactive glass-nav-link">Impact</a>

        <!-- Gallery & News: uncomment to show in the menu -->
        <!-- <a href="gallery.html" data-page="gallery" class="nav-link-inactive glass-nav-link">Gallery</a> -->
        <!-- <a href="news.html" data-page="news" class="nav-link-inactive glass-nav-link">News</a> -->

        <!-- Partners Dropdown -->
        <div class="dropdown-group">
          <span id="partners-dropdown-trigger" class="nav-link-inactive glass-nav-link dropdown-trigger" style="cursor:default;">
              Partner With Us <i class="fas fa-chevron-down"></i>
          </span>
          <div class="dropdown-menu wide">
            <a href="partners-development.html">Development Partners</a>
            <a href="partners-education.html">Education Institutions</a>
            <a href="partners-publishers.html">Publishers</a>
            <a href="partners-technology.html">Technology Partners</a>
          </div>
        </div>

        <!-- <a href="get-involved.html" data-page="get-involved" class="nav-link-inactive glass-nav-link">Get Involved</a> -->

        <a href="contact.html" data-page="contact" class="nav-link-inactive glass-nav-link">Contact</a>
      </nav>

      <div class="flex items-center gap-3">
        <!-- Donate hidden until payment is connected
        <a class="hidden md:flex donate-btn-glass" href="donate.html">
          <i class="fas fa-heart text-white"></i> Donate
        </a>
        -->
        <button id="menu-open" class="md:hidden text-2xl text-orange-900 focus:outline-none hamburger-btn" aria-label="Open menu">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
  </header>
`;

  var FOOTER_HTML = `
  <footer class="bg-slate-50 pt-20 pb-10 border-t border-orange-100">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <!-- Column 1: Brand -->
        <div class="col-span-1">
          <div class="flex items-center space-x-2 mb-6">
            <img alt="Sua Ne Ani Logo" class="h-10" src="images/logo.png">
            <span class="text-2xl font-bold text-orange-900">suaneani</span>
          </div>
          <p class="text-gray-500 text-sm leading-relaxed mb-6">We believe in a world where learning opens minds, vision creates possibilities and together we build a future worth living for generations to come.</p>
          <!-- Social links hidden for now -->
          <div class="flex space-x-4" style="display:none">
            <a class="text-gray-400 hover:text-orange-500" href="#"><i class="fab fa-facebook-f text-xl"></i></a>
            <a class="text-gray-400 hover:text-orange-500" href="#"><i class="fab fa-instagram text-xl"></i></a>
            <a class="text-gray-400 hover:text-orange-500" href="#"><i class="fab fa-twitter text-xl"></i></a>
          </div>
        </div>

        <!-- Column 2: Quick Links -->
        <div>
          <h5 class="font-bold mb-6">Quick Links</h5>
          <ul class="space-y-3 text-sm text-gray-500">
            <li><a class="hover:text-orange-500" href="about.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>About Us</a></li>
            <li><a class="hover:text-orange-500" href="about.html#story"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Our Story</a></li>
            <li><a class="hover:text-orange-500" href="programs.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Programs</a></li>
            <li><a class="hover:text-orange-500" href="impact.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Impact</a></li>
            <!-- Gallery & News: uncomment to show in the footer -->
            <!-- <li><a class="hover:text-orange-500" href="gallery.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Gallery</a></li> -->
            <!-- <li><a class="hover:text-orange-500" href="news.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>News</a></li> -->
          </ul>
        </div>

        <!-- Column 3: Partners (NEW) -->
        <div>
          <h5 class="font-bold mb-6">Partners</h5>
          <ul class="space-y-3 text-sm text-gray-500">
            <li><a class="hover:text-orange-500" href="partners-development.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Development</a></li>
            <li><a class="hover:text-orange-500" href="partners-education.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Education</a></li>
            <li><a class="hover:text-orange-500" href="partners-publishers.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Publishers</a></li>
            <li><a class="hover:text-orange-500" href="partners-technology.html"><i class="fas fa-chevron-right text-[10px] mr-2"></i>Technology</a></li>
          </ul>
        </div>

        <!-- Column 4: Get Involved -->
        <div>
          <h5 class="font-bold mb-6">Get Involved</h5>
          <ul class="space-y-3 text-sm text-gray-500">
            <li><a class="hover:text-orange-500" href="get-involved.html#volunteer"><i class="fas fa-hand-holding-heart mr-2"></i>Volunteer</a></li>
            <li style="display:none"><a class="hover:text-orange-500" href="donate.html"><i class="fas fa-donate mr-2"></i>Donate</a></li>
            <!-- <li><a class="hover:text-orange-500" href="get-involved.html#ambassador"><i class="fas fa-user-plus mr-2"></i>Ambassador</a></li> -->
          </ul>
        </div>

        <!-- Column 5: Newsletter (hidden for now) -->
        <div style="display:none">
          <h5 class="font-bold mb-6">Newsletter</h5>
          <p class="text-sm text-gray-500 mb-4">Subscribe for updates.</p>
          <form class="flex flex-col gap-2">
            <input class="px-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="Enter your email" type="email"/>
            <button class="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-orange-600" type="submit"><i class="fas fa-paper-plane mr-2"></i>Subscribe</button>
          </form>
        </div>
      </div>

      <div class="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        <p>© 2026 Sua Ne Ani. All Rights Reserved.</p>
        <div class="flex space-x-6 mt-4 md:mt-0">
          <a class="hover:text-orange-500" href="privacy.html">Privacy Policy</a>
          <a class="hover:text-orange-500" href="terms.html">Terms of Service</a>
        </div>
        <p class="mt-4 md:mt-0"><i class="fas fa-heart text-red-400 mr-1"></i> Designed for learning & humanity.</p>
      </div>
    </div>
  </footer>
`;

  // ---------------------------------------------------------------- insert
  var style = document.createElement('style');
  style.textContent = HEADER_CSS;
  document.head.appendChild(style);

  var headerSlot = document.getElementById('header-component');
  if (headerSlot) headerSlot.innerHTML = HEADER_HTML;
  var footerSlot = document.getElementById('footer-component');
  if (footerSlot) footerSlot.innerHTML = FOOTER_HTML;

  // ---------------------------------------------------------------- mobile menu
  function setMenu(open) {
    var overlay = document.getElementById('mobile-overlay');
    var panel = document.getElementById('mobile-panel');
    if (overlay) overlay.classList.toggle('open', open);
    if (panel) panel.classList.toggle('open', open);
    document.body.classList.toggle('no-scroll', open);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#menu-open')) { e.preventDefault(); setMenu(true); return; }
    if (e.target.closest('#close-mobile')) { e.preventDefault(); setMenu(false); return; }
    var overlay = e.target.closest('#mobile-overlay');
    if (overlay && overlay.classList.contains('open')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  // ---------------------------------------------------------------- active tab
  var partnerPages = ['partners-development', 'partners-education', 'partners-publishers', 'partners-technology'];

  function pageName(href) {
    var name = (href || '').split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/, '');
    return (name === '' || name === 'index') ? 'home' : name;
  }

  function setActiveTab() {
    var current = pageName(window.location.pathname);
    var isPartnerPage = partnerPages.indexOf(current) !== -1;

    document.querySelectorAll('#main-nav a[data-page]').forEach(function (link) {
      var active = link.getAttribute('data-page') === current;
      link.classList.toggle('nav-link-active', active);
      link.classList.toggle('nav-link-inactive', !active);
    });

    var trigger = document.getElementById('partners-dropdown-trigger');
    if (trigger) {
      ['text-[#f5a623]', 'border-b-2', 'border-[#f5a623]'].forEach(function (c) { trigger.classList.toggle(c, isPartnerPage); });
      trigger.classList.toggle('nav-link-inactive', !isPartnerPage);
    }

    document.querySelectorAll('#main-nav .dropdown-menu a').forEach(function (link) {
      var active = pageName(link.getAttribute('href')) === current;
      ['bg-[#fef3c7]', 'text-[#d97706]', 'font-semibold'].forEach(function (c) { link.classList.toggle(c, active); });
    });

    document.querySelectorAll('#mobile-panel a').forEach(function (link) {
      if (link.classList.contains('donate-mobile')) return;
      var active = pageName(link.getAttribute('href')) === current;
      link.classList.toggle('mobile-link-active', active);
      link.classList.toggle('mobile-link-inactive', !active);
    });
  }

  setActiveTab();
  window.setActiveTab = setActiveTab;
})();

document.addEventListener('click', function (e) {
    const btn = e.target.closest('#menuToggle');
    if (!btn) return;

    const said = document.getElementById('navSaid');
    if (!said) {
        console.error('menuToggle was clicked, but #navSaid was not found in the page.');
        return;
    }

    const isOpen = said.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
});

console.log('nav.js loaded'); // you should see this in console on page load//

(function () {
    const wrapper = document.getElementById('sliderWrapper');
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('#sliderDots .dot');

    const realSlides = Array.from(track.querySelectorAll('.image'));
    const total = realSlides.length; // real slide count (dots match this)

    // Clone the first slide and append it after the last slide.
    // This lets the track keep sliding "forward" past the last real
    // slide instead of animating backwards to index 0.
    const firstClone = realSlides[0].cloneNode(true);
    firstClone.setAttribute('aria-hidden', 'true');
    track.appendChild(firstClone);

    // current: real index (0..total-1) used for dots
    // trackIndex: position in the track, which includes the clone at `total`
    let current = 0;
    let trackIndex = 0;

    let isDragging = false;
    let isHovering = false;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let autoplayTimer = null;

    const AUTOPLAY_DELAY = 3500;   // time between auto slides
    const DRAG_THRESHOLD = 0.15;   // fraction of width needed to trigger a slide change

    function updateDots() {
        dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }

    function setPosition(animate = true) {
        track.classList.toggle('no-transition', !animate);
        track.style.transform = 'translateX(' + (-trackIndex * 100) + '%)';
        updateDots();
    }

    // Jump directly to a real slide (used by dots) — always short, direct hop
    function goTo(index) {
        current = (index + total) % total;
        trackIndex = current;
        setPosition(true);
    }

    // Advance forward by one, using the clone to stay seamless at the end
    function nextSlide() {
        trackIndex++;
        current = trackIndex % total;
        setPosition(true);

        if (trackIndex === total) {
            // We've landed on the clone (visually identical to slide 0).
            // After the slide-in animation finishes, snap back to the
            // real slide 0 with no transition so it looks continuous.
            window.setTimeout(() => {
                trackIndex = 0;
                setPosition(false);
            }, 500); // must match the CSS transition duration
        }
    }

    function prevSlideManual() {
        if (trackIndex === 0) {
            // jump instantly to the clone position (end), then animate back one step
            trackIndex = total;
            setPosition(false);
            // force reflow so the no-transition jump applies before animating
            track.offsetHeight;
            trackIndex = total - 1;
            current = trackIndex;
            setPosition(true);
        } else {
            trackIndex--;
            current = trackIndex;
            setPosition(true);
        }
    }

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
    }

    function restartAutoplay() {
        // Don't resume if the cursor is still sitting on the slider
        if (!isHovering) startAutoplay();
    }

    // ---- Dots ----
    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            goTo(parseInt(dot.dataset.index, 10));
            restartAutoplay();
        });
    });

    // ---- Drag / swipe with the cursor ----
    function getX(e) {
        return e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    }

    function dragStart(e) {
        isDragging = true;
        startX = getX(e);
        prevTranslate = -trackIndex * wrapper.getBoundingClientRect().width;
        wrapper.classList.add('dragging');
        track.classList.add('no-transition');
        stopAutoplay();
    }

    function dragMove(e) {
        if (!isDragging) return;
        const x = getX(e);
        const delta = x - startX;
        currentTranslate = prevTranslate + delta;
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
    }

    function dragEnd() {
        if (!isDragging) return;
        isDragging = false;
        wrapper.classList.remove('dragging');
        track.classList.remove('no-transition');

        const width = wrapper.getBoundingClientRect().width;
        const movedBy = currentTranslate - prevTranslate;

        if (movedBy < -width * DRAG_THRESHOLD) {
            nextSlide();          // dragged left -> go forward (seamless at the end)
        } else if (movedBy > width * DRAG_THRESHOLD) {
            prevSlideManual();    // dragged right -> go backward (seamless at the start)
        } else {
            setPosition(true);    // not enough movement, snap back
        }

        restartAutoplay();
    }

    // Mouse events (cursor drag)
    wrapper.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragEnd);

    // Touch events (mobile swipe)
    wrapper.addEventListener('touchstart', dragStart, { passive: true });
    wrapper.addEventListener('touchmove', dragMove, { passive: true });
    wrapper.addEventListener('touchend', dragEnd);

    // Pause autoplay while hovering, resume on leave
    wrapper.addEventListener('mouseenter', () => {
        isHovering = true;
        stopAutoplay();
    });
    wrapper.addEventListener('mouseleave', () => {
        isHovering = false;
        if (!isDragging) startAutoplay();
    });

    // Keep the track aligned on resize
    window.addEventListener('resize', () => setPosition(false));

    // Init
    setPosition(false);
    startAutoplay();
})();


document.addEventListener('DOMContentLoaded', function () {
    const viewport = document.getElementById('reviewViewport');
    const track = document.getElementById('reviewTrack');
    const prevBtn = document.getElementById('reviewPrev');
    const nextBtn = document.getElementById('reviewNext');

    if (!track || !viewport || !prevBtn || !nextBtn) return;

    // Keep a permanent copy of the real boxes (never mutated)
    const originalBoxes = Array.from(track.children);
    const total = originalBoxes.length;

    let perView = getPerView();
    let position = 0;      // index within the extended (cloned) track
    let isAnimating = false;
    let isHovering = false;
    let autoplayTimer = null;

    const AUTOPLAY_DELAY = 4000;
    const STEP = 1; // always move one box per slide, regardless of perView

    function getPerView() {
        const w = window.innerWidth;
        if (w <= 640) return 1;
        if (w <= 1024) return 2;
        return 3;
    }

    // Rebuild the track with clone padding on both sides, sized to the current perView
    function buildTrack() {
        track.innerHTML = '';

        const leadingClones = originalBoxes
            .slice(total - perView)
            .map(function (box) { return box.cloneNode(true); });

        const trailingClones = originalBoxes
            .slice(0, perView)
            .map(function (box) { return box.cloneNode(true); });

        leadingClones.forEach(function (clone) { track.appendChild(clone); });
        originalBoxes.forEach(function (box) { track.appendChild(box); });
        trailingClones.forEach(function (clone) { track.appendChild(clone); });

        position = perView; // start on the real first box
        setTransform(false);
    }

    function setTransform(animate) {
        const children = track.children;
        const boxWidth = children[0].getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const offset = position * (boxWidth + gap);

        track.classList.toggle('no-transition', !animate);
        track.style.transform = 'translateX(' + (-offset) + 'px)';
    }

    function goToPosition(newPosition) {
        if (isAnimating) return;
        isAnimating = true;
        position = newPosition;
        setTransform(true);
    }

    function nextSlide() {
        goToPosition(position + STEP);
    }

    function prevSlide() {
        goToPosition(position - STEP);
    }

    track.addEventListener('transitionend', function () {
        // Real, non-clone range is [perView, perView + total - 1].
        // If we've drifted into clone territory, silently snap back
        // to the equivalent real position, one "total" away.
        if (position >= perView + total) {
            position -= total;
            setTransform(false);
        } else if (position < perView) {
            position += total;
            setTransform(false);
        }
        isAnimating = false;
    });

    nextBtn.addEventListener('click', function () {
        nextSlide();
        restartAutoplay();
    });

    prevBtn.addEventListener('click', function () {
        prevSlide();
        restartAutoplay();
    });

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
    }

    function restartAutoplay() {
        if (!isHovering) startAutoplay();
    }

    viewport.addEventListener('mouseenter', function () {
        isHovering = true;
        stopAutoplay();
    });

    viewport.addEventListener('mouseleave', function () {
        isHovering = false;
        startAutoplay();
    });

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            const newPerView = getPerView();
            if (newPerView !== perView) {
                perView = newPerView;
                buildTrack(); // rebuild clone padding for the new per-view count
            } else {
                setTransform(false); // just reposition for the new box width
            }
        }, 150);
    });

    buildTrack();
    startAutoplay();
});
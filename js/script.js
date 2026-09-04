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

    const AUTOPLAY_DELAY = 4000;   // time between auto slides
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
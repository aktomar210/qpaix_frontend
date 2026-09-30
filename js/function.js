(function ($) {
    "use strict";
	
	var $window = $(window); 
	var $body = $('body'); 

	/* Preloader Effect JS — Ultra-Fast Optimized Loader Dismissal */
	var preloaderHidden = false;

	function hidePreloader() {
		if (preloaderHidden) return;
		preloaderHidden = true;
		var $loader = $(".preloader");
		if ($loader.length) {
			$loader.addClass('loaded');
			$loader.fadeOut(180, function() {
				$loader.css({ display: "none", visibility: "hidden", pointerEvents: "none" });
			});
		}
		try {
			sessionStorage.setItem("qpaix_visited", "1");
		} catch (e) {}
	}

	window.notifyQpaixDataReady = function () {
		hidePreloader();
	};

	// If the user already visited any page in this session, hide almost instantaneously (60ms)
	var isSubsequentNav = false;
	try {
		isSubsequentNav = !!sessionStorage.getItem("qpaix_visited");
	} catch (e) {}

	if (isSubsequentNav) {
		setTimeout(hidePreloader, 60);
	} else {
		// First load in session: dismiss as soon as DOM is ready, with smooth 180ms transition
		if (document.readyState === "complete" || document.readyState === "interactive") {
			setTimeout(hidePreloader, 100);
		} else {
			document.addEventListener("DOMContentLoaded", function () {
				setTimeout(hidePreloader, 180);
			});
		}
	}

	// Always guarantee the loader never blocks the user longer than 400ms under any circumstance
	setTimeout(function () {
		hidePreloader();
	}, 400);

	$(window).on("load", function () {
		hidePreloader();
	});
	
	/* Sticky Header JS */	
	if($('.active-sticky-header').length) {
		
		$window.on('resize', function() {
			setHeaderHeight();
		});

		function setHeaderHeight(){
	 		$("header.main-header").css("height", $('header .header-sticky').outerHeight());
		}	
	
		$(window).on("scroll", function() {
			var fromTop = $(window).scrollTop();
			setHeaderHeight();
			var headerHeight = $('header .header-sticky').outerHeight()
			$("header .header-sticky").toggleClass("hide", (fromTop > headerHeight + 100));
			$("header .header-sticky").toggleClass("active", (fromTop > 600));
		});
	}

	/* Mobile Menu Handling */
	const initialMenuItems = $('#menu > li').toArray();
	const initialMenu2Items = $('#menu2 > li').toArray();

	const handleMobileMenus = () => {
        const isMobile = $window.width() <= 991;
        const hasSlickNav = $(".slicknav_nav").length > 0;

        if (isMobile && !hasSlickNav) {
            $("#menu2").children().appendTo("#menu");
            $("#menu").slicknav({ label: "", prependTo: ".responsive-menu" });
        } else if (!isMobile && hasSlickNav) {
            $("#menu").slicknav("destroy");

            $("#menu > li").not(initialMenuItems).appendTo("#menu2");
            initialMenu2Items.forEach((item) => $(item).appendTo("#menu2"));
            initialMenuItems.forEach((item) => $(item).appendTo("#menu"));
        }
    };

	/* Run the function on page load */
    handleMobileMenus();

	// Exposed so cms.js can re-run this after replacing the header markup with the shared
	// master header template (the header, like the footer, is now injected identically on
	// every page rather than hand-duplicated per-page HTML).
	window.qpaixHandleMobileMenus = handleMobileMenus;

	if($(".orderby").length > 0 ) {
		$(".orderby").select2();  
	}
	let resizeTimeout;

	/* Re-run the function on window resize */
	$window.on("resize", function () {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(handleMobileMenus, 200); // Delay execution
	});
	
	/* Scroll to Top */
    $(document).on("click", "a[href='#top']", function (e) {
        e.preventDefault();
        $("html, body").animate({ scrollTop: 0 }, "slow");
    });

	/* Initialize Swiper Sliders */
    const initSwiper = (selector, options) => {
        if ($(selector).length) {
            return new Swiper(selector, options);
        }
        return null;
    };

	const swiperOptions = {
        slidesPerView: 1,
        speed: 1000,
        spaceBetween: 10,
        loop: true,
        autoplay: { delay: 5000 },
    };


    /* Hero Slider Start */
	initSwiper(".hero-slider-layout .swiper", {
        ...swiperOptions,
        autoplay: { delay: 5000 },
        pagination: { el: ".hero-pagination", clickable: true },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev"
        },
        on: {
            init: function () {
                animateActiveSlideText(); 
            },
            slideChangeTransitionStart: function () {
                animateActiveSlideText(); 
            }
        }
    });

    function animateActiveSlideText() {
        gsap.set(".text-anime-style-2", { clearProps: "all" });

        const activeSlide = document.querySelector(".swiper-slide-active");
        const animatedTextElements = activeSlide.querySelectorAll(".text-anime-style-2");

        animatedTextElements.forEach((element) => {
            const animationSplitText = new SplitText(element, { type: "chars, words" });

            gsap.from(animationSplitText.chars, {
				opacity: 0,
                duration: 0.2,         
				delay: 0.2,
				x: 250,                 
				autoAlpha: 0,
				stagger: 0.09,         
				ease: "power5.out",
            });
        });
    }
    /* Hero Slider End */

	/* Back To Top Button */
    const backToTop = document.getElementById('backToTop');
		window.addEventListener('scroll', () => {
			if (window.scrollY > 300) {
				backToTop.classList.add('show');
			} else {
				backToTop.classList.remove('show');
			}
		});

		backToTop.addEventListener('click', function (e) {
			e.preventDefault();
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});
    });

	/* Skill Bar */
	if ($('.skills-progress-bar').length) {
		let animated = false;

		$('.skills-progress-bar').waypoint(function () {
			if (!animated) {
			animated = true;

			$('.skillbar').each(function () {
				const $this = $(this);
				const percent = parseInt($this.attr('data-percent'));

				const $countBar = $this.find('.count-bar');
				const $countText = $this.find('.skill-no');

				// Set bar to 0% width initially
				$countBar.css('width', '0');

				// Animate bar width
				$countBar.animate({
					width: percent + '%'
				}, {
				duration: 2000,
				easing: 'swing'
				});

				// Animate number from 0 to percent
				$({ Counter: 0 }).animate({ Counter: percent }, {
				duration: 2000,
				easing: 'swing',
				step: function (now) {
					$countText.text(Math.ceil(now) + '%');
				}
				});
			});
			}
		}, {
			offset: '50%'
		});
    }

	/* Youtube Background Video JS */
	if ($('#herovideo').length) {
		var myPlayer = $("#herovideo").YTPlayer();
	}

	/* Audio JS */
	const player = new Plyr('#player');

	/* Init Counter */
	if ($('.counter').length) {
		$('.counter').counterUp({ delay: 6, time: 3000 });
	}

	/* Image Reveal Animation */
	if ($('.reveal').length) {
        gsap.registerPlugin(ScrollTrigger);
        let revealContainers = document.querySelectorAll(".reveal");
        revealContainers.forEach((container) => {
            let image = container.querySelector("img");
            let tl = gsap.timeline({
                scrollTrigger: {
                    trigger: container,
                    toggleActions: "play none none none"
                }
            });
            tl.set(container, {
                autoAlpha: 1
            });
            tl.from(container, 1, {
                xPercent: -100,
                ease: Power2.out
            });
            tl.from(image, 1, {
                xPercent: 100,
                scale: 1,
                delay: -1,
                ease: Power2.out
            });
        });
    }

	/* Text Effect Animation */
	if ($('.text-anime-style-1').length) {
		let staggerAmount 	= 0.05,
			translateXValue = 0,
			delayValue 		= 0.5,
		   animatedTextElements = document.querySelectorAll('.text-anime-style-1');
		
		animatedTextElements.forEach((element) => {
			let animationSplitText = new SplitText(element, { type: "chars, words" });
				gsap.from(animationSplitText.words, {
				duration: 1,
				delay: delayValue,
				x: 20,
				autoAlpha: 0,
				stagger: staggerAmount,
				scrollTrigger: { trigger: element, start: "top 85%" },
				});
		});		
	}
	
	if ($('.text-anime-style-3').length) {		
		let	animatedTextElements = document.querySelectorAll('.text-anime-style-3');
		
		 animatedTextElements.forEach((element) => {
			//Reset if needed
			if (element.animation) {
				element.animation.progress(1).kill();
				element.split.revert();
			}

			element.split = new SplitText(element, {
				type: "lines,words,chars",
				linesClass: "split-line",
			});
			gsap.set(element, { perspective: 400 });

			gsap.set(element.split.chars, {
				opacity: 0,
				x: "50",
			});

			element.animation = gsap.to(element.split.chars, {
				scrollTrigger: { trigger: element,	start: "top 90%" },
				x: "0",
				y: "0",
				rotateX: "0",
				opacity: 1,
				duration: 1,
				ease: Back.easeOut,
				stagger: 0.02,
			});
		});		
	}

	/* Parallaxie JS */
	var $parallaxie = $('.parallaxie');
	if($parallaxie.length && ($window.width() > 991))
	{
		if ($window.width() > 768) {
			$parallaxie.parallaxie({
				speed: 0.55,
				offset: 0,
			});
		}
	}

	/* Zoom Gallery Screenshot JS */
	$('.gallery-items').magnificPopup({
		delegate: 'a',
		type: 'image',
		closeOnContentClick: false,
		closeBtnInside: false,
		mainClass: 'mfp-with-zoom',
		image: {
			verticalFit: true,
		},
		gallery: {
			enabled: true
		},
		zoom: {
			enabled: true,
			duration: 300, // don't foget to change the duration also in CSS
			opener: function(element) {
			  return element.find('img');
			}
		}
	});

	/* Contact Form Validation JS */
	$("#contactForm").validator({ focus: false }).on("submit", function (event) {
        if (!event.isDefaultPrevented()) {
            event.preventDefault();
            submitForm("#contactForm", "saaspro-html/form-process.html", contactFormSuccess);
        }
    });

	const submitForm = (formId, url, successCallback) => {
        const formData = $(formId).serialize();
        $.post(url, formData, (response) => {
			if (typeof response === "string" && response.trim() === "success") {
				successCallback();
			} else {
				showMsg(false, response);
			}
		});
    };

	const contactFormSuccess = () => {
        $("#contactForm")[0].reset();
        showMsg(true, "Message Sent Successfully!");
    };

    const showMsg = (valid, msg) => {
        $("#msgSubmit").removeClass().addClass(valid ? "text-success" : "text-danger").text(msg);
    };
	/* End - Contact Form Validation JS */

	/* Animated Wow Js */	
	window.wow = new WOW();
	window.wow.init();

	/* Popup Video JS */
	if ($('.popup-video').length) {
		$('.popup-video').magnificPopup({
			type: 'iframe',
			mainClass: 'mfp-fade',
			removalDelay: 160,
			preloader: false,
			fixedContentPos: true
		});
	}

	/* In-position Scroll Autoplay Video JS */
	function initScrollAutoplayVideos() {
		var videoWrappers = document.querySelectorAll('.qpaix-scroll-video-wrap');
		if (!videoWrappers.length) return;

		videoWrappers.forEach(function (wrap) {
			var video = wrap.querySelector('.qpaix-scroll-video');
			var playBtn = wrap.querySelector('.qpaix-video-center-btn');
			var soundBtn = wrap.querySelector('.qpaix-video-sound-toggle');
			if (!video) return;

			// Required for mobile & modern browsers autoplay without user gesture
			video.muted = true;
			video.playsInline = true;

			function updateState() {
				if (!video.paused) {
					wrap.classList.add('is-playing');
				} else {
					wrap.classList.remove('is-playing');
				}
			}

			// Intersection Observer to autoplay when scrolled into view
			if ('IntersectionObserver' in window) {
				var observer = new IntersectionObserver(function (entries) {
					entries.forEach(function (entry) {
						if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
							var playPromise = video.play();
							if (playPromise !== undefined) {
								playPromise.then(updateState).catch(function () {});
							}
						} else {
							video.pause();
							updateState();
						}
					});
				}, {
					threshold: [0, 0.25, 0.5, 0.75]
				});
				observer.observe(wrap);
			}

			// Toggle play / pause on click
			function togglePlay(e) {
				if (e) e.preventDefault();
				if (video.paused) {
					var p = video.play();
					if (p !== undefined) p.then(updateState).catch(function () {});
				} else {
					video.pause();
					updateState();
				}
			}

			if (playBtn) playBtn.addEventListener('click', togglePlay);
			video.addEventListener('click', togglePlay);

			// Sound toggle
			if (soundBtn) {
				soundBtn.addEventListener('click', function (e) {
					e.stopPropagation();
					video.muted = !video.muted;
					var icon = soundBtn.querySelector('i');
					var text = soundBtn.querySelector('.qpaix-sound-text');
					if (video.muted) {
						if (icon) icon.className = 'fa-solid fa-volume-xmark';
						if (text) text.textContent = 'Unmute';
					} else {
						if (icon) icon.className = 'fa-solid fa-volume-high';
						if (text) text.textContent = 'Mute';
					}
				});
			}

			video.addEventListener('play', updateState);
			video.addEventListener('pause', updateState);
			video.addEventListener('ended', function () {
				video.currentTime = 0;
				video.play().then(updateState).catch(function () {});
			});
		});
	}
	initScrollAutoplayVideos();

	var sisfRippleEffect = {
		init: function () {
			var titleHolder = $(".sisf-page-title");
			if ( titleHolder.hasClass("sisf-title--ripple") ) {
				titleHolder.ripples({
					resolution: 512,
					dropRadius: 20,
					perturbance: 1.8,
				});
			}
		}
	}
	sisfRippleEffect.init();
	
    /* Natural Water Movements */
	(function autoRipple() {
		const $el = $('.sisf-page-title');
		if (!$el.length || !$el.data('ripples')) return;  // Ensure target and plugin

		const dropDelay = 2000; // ms
		let lastDropTime = performance.now();

		function dropRipple(timestamp) {
			if (timestamp - lastDropTime >= dropDelay) {
				const x = Math.random() * $el.outerWidth();
				const y = Math.random() * $el.outerHeight();
				const dropRadius = 20;
				const strength = 0.08 + Math.random() * 0.08;

				$el.ripples('drop', x, y, dropRadius, strength);
				lastDropTime = timestamp;
			}
			requestAnimationFrame(dropRipple);
		}

		requestAnimationFrame(dropRipple);
	})();


	/* comman-swiper-slider JS */
	initSwiper(".comman--swiper-slider .swiper", {
		...swiperOptions,
		breakpoints: {
			0: {
				slidesPerView: 1,
				centeredSlides: false
			},
			768: {
				slidesPerView: 3,
				centeredSlides: true
			},
			1024: {
				slidesPerView: 5,
				centeredSlides: true
			}
		}
	});

	/* Common Swiper Slider JS */
	initSwiper(".comman-swiper-slider .swiper", {
		...swiperOptions,
		navigation: {
			nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
		},
		breakpoints: {
			0: {
				slidesPerView: 1,
			},
			768: {
				slidesPerView: 2,
			},
			1024: {
				slidesPerView: 4,
			}
		}
	});

	/* Our Expert Squad Single-Row Auto-Slider JS (Matches User Screenshot) */
	initSwiper(".sisf-expert-squad-slider .swiper", {
		slidesPerView: 4,
		spaceBetween: 24,
		loop: true,
		speed: 900,
		grabCursor: true,
		autoplay: {
			delay: 2400,
			disableOnInteraction: false,
			pauseOnMouseEnter: true
		},
		breakpoints: {
			0: {
				slidesPerView: 1,
				spaceBetween: 16
			},
			576: {
				slidesPerView: 2,
				spaceBetween: 20
			},
			992: {
				slidesPerView: 3,
				spaceBetween: 24
			},
			1200: {
				slidesPerView: 4,
				spaceBetween: 24
			}
		}
	});

	/* Sisf-Sis-Slider JS */
	initSwiper(".sisf-sis-slider .swiper", {
		...swiperOptions,
		navigation: {
			nextEl: ".swiper-button-next",
			prevEl: ".swiper-button-prev"
		},
		breakpoints: {
			0: {
				slidesPerView: 1,
				centeredSlides: false
			},
			768: {
				slidesPerView: 2,
				centeredSlides: false
			},
			1024: {
				slidesPerView: 3,
				centeredSlides: false
			}
		}
	});

	/* Sisf-Sis-Slider JS */
	initSwiper(".sisf--sis-slider .swiper", {
		...swiperOptions,
		navigation: {
			nextEl: ".portfolio--list-section .swiper-button-next, .sisf--sis-slider .swiper-button-next",
			prevEl: ".portfolio--list-section .swiper-button-prev, .sisf--sis-slider .swiper-button-prev"
		},
		pagination: {
			el: ".portfolio--list-section .swiper-pagination, .sisf--sis-slider .swiper-pagination",
			clickable: true
		},
		breakpoints: {
			0: {
				slidesPerView: 1,
				spaceBetween: 16,
				centeredSlides: false
			},
			640: {
				slidesPerView: 1.4,
				spaceBetween: 20,
				centeredSlides: false
			},
			768: {
				slidesPerView: 2,
				spaceBetween: 22,
				centeredSlides: false
			},
			1024: {
				slidesPerView: 2.5,
				spaceBetween: 24,
				centeredSlides: false
			},
			1200: {
				slidesPerView: 3,
				spaceBetween: 26,
				centeredSlides: false
			}
		}
	});

	/* sisf-single-slider JS */
	document.querySelectorAll('.sisf-single-slider').forEach((sliderContainer) => {
		const row = sliderContainer.closest('.row'); 

		const swiper = new Swiper(sliderContainer.querySelector('.swiper'), {
			...swiperOptions,
			navigation: {
				nextEl: row.querySelector('.custom-icon-up'),
				prevEl: row.querySelector('.custom-icon-down')
			},
			pagination: {
				el: sliderContainer.querySelector('.swiper-pagination'),
				clickable: true,
			},
			breakpoints: {
				0: {
					slidesPerView: 1,
					centeredSlides: false
				},
				768: {
					slidesPerView: 1,
					centeredSlides: true
				},
				1024: {
					slidesPerView: 1,
					centeredSlides: true
				}
			}
		});
	});

	/* Section Title Scroll Animation JS */
	if ($('.sisf-m-title--scroll').length) {
        gsap.registerPlugin(ScrollTrigger);
        let sisSectionTitles = document.querySelectorAll(".sisf-m-title--scroll");
        if (sisSectionTitles.length > 0) {
			sisSectionTitles.forEach((container) => {
				var text = new SplitText(container, { type: 'words, chars' });
				text.words.forEach((word) => {
					if (word.children.length > 0) {
						word.children[0].classList.add("first-char");
					}
				});
				gsap.fromTo(text.chars,
					{
						position: 'relative',
						display: 'inline-block',
						opacity: 0.2,
						x: -7,
					},
					{
						opacity: 1,
						x: 0,
						stagger: 0.1,
						scrollTrigger: {
							trigger: container,
							toggleActions: "play pause reverse pause",
							start: "top 90%",
							end: "top 40%",
							scrub: 0.7,
						}
					}
				);
			});
		}
    }

	/* Rotate Image On Scroll Js */
		let lastScrollTop = 0;
		let rotation = 0;

		window.addEventListener('scroll', function () {
			const img = document.querySelector('#sisf-m-image--scroll'); 
			if (!img) return;
			let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
			if (scrollTop > lastScrollTop) {
				rotation += 1.3; 
			} else {
				rotation -= 1.3; 
			}
			img.style.transform = `rotate(${rotation}deg)`;
			lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
	});

	$(function () {

		// Shop List With Filter Category Button
		const $hiddenCategoryItems = $('.hidden-item');
		$hiddenCategoryItems.hide();
		
		$('.toggle-icon').removeClass('fa-minus').addClass('fa-plus');
		$('.toggle-text').text('View More');
		
		$(document).on('click', '#toggleView', function () {
			const isVisible = $hiddenCategoryItems.first().is(':visible');
			$hiddenCategoryItems.toggle(!isVisible);
		
			$('.toggle-icon')
			.toggleClass('fa-plus', isVisible)
			.toggleClass('fa-minus', !isVisible);
			$('.toggle-text').text(isVisible ? 'View More' : 'View Less');
		});
	});

	/* Product Quantity Plus Minus JS */
	$(document).on("click", ".sisf-quantity-minus, .sisf-quantity-plus", function (e) {
        e.preventDefault();
        const $button = $(this);
        const $inputField = $button.siblings(".sisf-quantity-input");
        const step = parseFloat($inputField.data("step")) || 1;
        const max = parseFloat($inputField.data("max"));
        const min = parseFloat($inputField.data("min")) || 1;
        let inputValue = parseFloat($inputField.val()) || min;

        inputValue = $button.hasClass("sisf-quantity-minus") ? Math.max(min, inputValue - step) : (Number.isNaN(max) ? inputValue + step : Math.min(max, inputValue + step));
        $inputField.val(inputValue).trigger("change");
    });

})(jQuery);
/*TO DOs:
Add a kupietools tab for this, with buttons for "show all draggable items" and "reset all draggable items".
Make all kupietools tabs line up instead of hardcoding positions from top... use a CSS variable and have the plugins tell sessionStorage how many plugins have loaded, then compute the top.
Make a settings panel for this, let users enter the config. Need to figure out how to let users enter the config object.
*/
class AdvancedDraggable {
    constructor(config) {
        this.config = config;
        this.activeElement = null;
        this.isDragging = false;
        this.dragStarted = false;
		
		
		//Additions for using animation frames
		this.lastPosition = { x: 0, y: 0 };
        this.nextFrame = null;
        this.pendingUpdate = false;
        //End Additions for using animation frames
		
		
        // --- START CHANGES: ADD THESE LINES ---
        // These will be used specifically for tracking touch movement
        this.touchStartX = 0; // Stores initial X coordinate of a touch for threshold check
       this.touchStartY = 0; // Stores initial Y coordinate of a touch for threshold check
       this.touchMovementThreshold = 10; // Pixels: If touch moves less than this, it's considered a click.
                                         // Adjust this value (e.g., 5-20) based on desired tap sensitivity.
       this.isTouchSequenceActive = false; // Flag to track a valid single-finger touch interaction
    
		//On mobile, a drag can be triggered with vanishingly small movements, which will suppress the 'click' it would otherwise register as on, say, desktop, because the movement really is so tiny the user thinks it's a click. So, on mobile, we'll only consider it a drag after the touch has moved more than a threshold.
        // --- END CHANGES ---
		
        this.init();
    } 

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupDraggables();
            });
        } else {
            this.setupDraggables();
        }
        
        // Use MutationObserver to watch for new elements in real-time
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
					/* console.log("mutation",mutation); */
                    if ((mutation.type === 'childList' && mutation.addedNodes.length > 0) || mutation.attributeName === 'class') {
						var theseNodes = [];
							if (mutation.attributeName === 'class') {
								const childrenArray = Array.from(mutation.target.querySelectorAll('*')); 
  theseNodes = [mutation.target, ...childrenArray];/*console.log("mutation.target",mutation.target,"childrenArray",childrenArray);console.log("these Nodes",theseNodes);*/
							} else {theseNodes = mutation.addedNodes;/* console.log("AddedNodes",mutation.addedNodes);*/}
                        //console.log('操 DOM changed - nodes added:', mutation.addedNodes.length);
                        theseNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                               // console.log('  逃 Added element:', node.tagName, node.id || '(no id)', node.className || '(no class)');
                                
                                // Check if the added node itself matches our selectors
                                this.config.forEach(item => {
                                    if (node.matches && node.matches(item.selector)) {
										//                                        console.log(`識 Found new element immediately: ${item.selector}`, node);
                                        if (!node.hasAttribute('data-draggable')) {
                                            this.makeDraggable(node, item);
                                        }
                                    }
                                    
                                    // Also check if any children of the added node match
                                    if (node.querySelectorAll) {
                                        const childMatches = node.querySelectorAll(item.selector);
                                        if (childMatches.length > 0) {
                                          //  console.log(`識 Found ${childMatches.length} child elements matching ${item.selector}`);
                                        }
                                        childMatches.forEach(child => {
                                            if (!child.hasAttribute('data-draggable')) {
                                               // console.log(`識 Found new child element: ${item.selector}`, child);
                                                this.makeDraggable(child, item);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true,
				attributes: true, /* needed for class changes */
				attributeFilter: ['class','id'] /* if you want to trigger off dynamic changes to more attributes, add them here */
            });
            
            //console.log('MutationObserver set up - watching for dynamic elements in real-time');
        } else {
            //console.log('MutationObserver not supported');
        }
    }

    setupDraggables() {
        //console.log('Setting up draggables:', this.config);
        const cssRules=`
/* no longer needed .is-dragging::before, */ *[data-draggable=true] .ktwp-de-effectsDiv::before {
	z-index:999999;
	opacity: 0;
  transition: opacity .1s ease-in;
  
  transition-delay: 0s;
	content: '';
	position: absolute;
	top: -40%;
	left: -40%;
	right: -40%;
	bottom: -40%;
	/* background-color: rgba(255, 255, 255, 0.1); */
	background-repeat: no-repeat;
	background-position: center center;
	background-size: clamp(60px,50%,160px); /* was "contain", but wanted it not to overwhelm big panels */
	pointer-events: none;
	
	overflow: visible;
background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path stroke=\"rgba(190,190,190,1)\" stroke-width=\".7\"  fill=\"rgba(0,0,0,0.3)\" d=\"M8.326 5.327 12.03 1l3.705 4.327h-1.853v4.349h-3.705V5.326zM15.736 18.734 12.03 23.06l-3.706-4.327h1.853v-4.348h3.705v4.348zM18.734 8.325l4.327 3.706-4.327 3.705v-1.853h-4.348v-3.705h4.348zM5.327 15.736 1 12.03l4.327-3.706v1.853h4.349v3.705H5.326z\"/></svg>');}


.ktwp-de-effectsDiv{position:absolute !important; left:0 !important;top:0 !important;bottom:0 !important;right:0 !important;background:transparent !important;filter:none !important;backdropFilter:none !important;border-radius:inherit;pointer-events:none;}
.is-dragging .ktwp-de-effectsDiv::before {
	opacity: .5;
	/* transition-delay: 0s; */
	/* transition-duration: 0s; */
	 	
}
*[data-draggable="true"]:hover:not(.is-dragging):not(.ktwp-de-disablehover) .ktwp-de-effectsDiv::before { /* not(.ktwp-de-disablehover) so don't flash the arrows while dragging */
   animation: animateArrows 2s linear; 
	 animation-delay:1.5s;
}

/* takign advantage of inheritance rules here */
*[data-draggable=true].ktwp-de-cdrag .ktwp-de-effectsDiv::before {background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><g fill=\"rgba(0,0,0,0.3)\" stroke=\"rgba(190,190,190,1)\" stroke-width=\".7\" ><path  d=\"m5.56 15.5-2.74 3.201-2.74-3.2h1.37v-3.217h2.74V15.5zM18.5 8.828l2.741-3.2 2.74 3.2h-1.37v3.216h-2.74V8.828zM.08 9.056l2.74-3.201 2.74 3.2H4.19v3.217H1.45V9.056zM23.981 15.273l-2.74 3.201-2.74-3.2h1.37v-3.217h2.74v3.216z\"/><circle cx=\"2.77\" cy=\"3.163\" r=\"1.993\"/><circle cx=\"2.77\" cy=\"21.389\" r=\"1.993\"/><circle cx=\"21.189\" cy=\"3.163\" r=\"1.993\"/><circle cx=\"21.189\" cy=\"21.389\" r=\"1.993\"/><circle cx=\"50.136\" cy=\"20.534\" r=\"0\"/><path d=\"m8.688 5.694-3.2-2.74 3.2-2.74v1.37h3.216v2.74H8.688zM15.133.214l3.2 2.74-3.2 2.74v-1.37h-3.216v-2.74h3.216zM15.133 18.634l3.2 2.74-3.2 2.741v-1.37h-3.216v-2.74h3.216zM8.688 24.115l-3.2-2.74 3.2-2.74v1.37h3.216v2.74H8.688z\"/></g></svg>');}
*[data-draggable=true].ktwp-de-hdrag > .ktwp-de-effectsDiv::before {background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path stroke=\"rgba(190,190,190,1)\" stroke-width=\".7\"  fill=\"rgba(0,0,0,0.3)\" d=\"m18.734 8.325 4.327 3.706-4.327 3.705v-1.853h-4.348v-3.705h4.348zM5.327 15.736 1 12.03l4.327-3.706v1.853h4.349v3.705H5.326z\"/></svg>');}
*[data-draggable=true].ktwp-de-vdrag > .ktwp-de-effectsDiv::before {background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path stroke=\"rgba(190,190,190,1)\" stroke-width=\".7\"  fill=\"rgba(0,0,0,0.3)\" d=\"M8.326 5.327 12.03 1l3.705 4.327h-1.853v4.349h-3.705V5.326zM15.736 18.734 12.03 23.06l-3.706-4.327h1.853v-4.348h3.705v4.348z\"/></svg>');}

/* DON'T NEED ANYMORE  .is-dragging::after, */ *[data-draggable=true]  .ktwp-de-effectsDiv::after {
	opacity: 0;
  transition: opacity .1s ease-in;
    transition-delay: 0s;
	content: ''; 
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
 /*   border: 2px dashed red; */
    border-radius: inherit;
	position: absolute; 
 

  /*  transform: scale(0.9) translateZ(0); */
   filter: blur(5px); 
	/*was 20, with opacity .75 */

    background: linear-gradient(
      to left,
      red,
      orange,
      yellow,
      green,
      blue,
      #8800FF,
      #FF0088
    );
	animation-delay: 3s;
    background-size: 200% 200%;
   animation: animateGlow 1.25s linear infinite; 
	clip-path: polygon(-100% -100%, -100% 200%, -1% 200%, -1% -1%, 101% -1%, 101% 101%, -1% 101%, -1% 200%, 200% 200%, 200% -100%) ;
	/* mask-image: radial-gradient(transparent 15% , #0009 100%); */ /*alternative effect */
}

 *[data-draggable="true"]:not(.is-dragging):not(.ktwp-de-disablehover):hover  .ktwp-de-effectsDiv::after {
	opacity: .8;
	transition-delay: 2.5s;
	transition-duration: 0.5s;
}

.is-dragging > .ktwp-de-effectsDiv::after {
	opacity: .8;
	transition-delay: 0s;
	transition-duration: 0s;
}


@keyframes animateGlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }

}

@keyframes animateArrows {
  0%,25%,50%,75%,100% {
    opacity: 0;
  }
  12%,37%,62%, 83% {
    opacity: .98;
  }
}

.is-dragging  > .ktwp-de-effectsDiv {
	  cursor: grabbing !important;
	 border-width:2px; /*nah, causes content shifts on things without borders. We'll only do this if things already have a border. . */
border:inherit dashed  #777 !important; 
	  border-color:rgba(0,0,0,0) !important;/* hide borders, ::after element will draw them. this way drawing a border won't move the contents, whether or not there's already a border */
	

 
}
`;
		
		var cssStyle = document.createElement("style");
		cssStyle.textContent = cssRules;
		document.head.appendChild(cssStyle);

        this.config.forEach(item => {
            const elements = document.querySelectorAll(item.selector);
            //console.log(`Found ${elements.length} elements for ${item.selector}`);
            
            elements.forEach(element => {
                if (!element.hasAttribute('data-draggable')) {
                    this.makeDraggable(element, item);
                }
            });
        });
    }
makeDraggable(element, config) {
        element.draggableConfig = config;
        
        // Basic setup
        element.setAttribute('data-draggable', 'true');
        // store initial position to revert to absolute if needed later
        element.setAttribute('data-ktwp-de-position', getComputedStyle(element)["position"]);
        
        element.style.cursor = 'move';
        element.style.userSelect = 'none';
        element.style.touchAction = "none";
        
        const constraintDesc = {"vertical":{"desc":"vertically","class":"vdrag"},"horizontal":{"desc":"horizontally","class":"hdrag"},"corners":{"desc":"to any corner","class":"cdrag"}};
        element.title = (element.title ? element.title + " - " : "") + "☝ Drag me " + (constraintDesc[config.constraint] && constraintDesc[config.constraint].desc ? constraintDesc[config.constraint].desc + " " : "") + "to reposition!";
        if (constraintDesc[config.constraint] && constraintDesc[config.constraint].class) { 
            element.classList.add("ktwp-de-" + constraintDesc[config.constraint].class);
        }

        // --- CORNER LOGIC: IMMEDIATE ---
        // We MUST do this here. If we do this lazily (on hover), the element will 
        // jump away from the mouse the moment the user tries to interact with it.
        if (config.constraint === 'corners') {
            const margin = config.cornerMargin || 25;
            element.style.position = 'fixed';
            element.style.left = margin + 'px';
            element.style.bottom = margin + 'px';
            element.style.top = 'auto';
            element.style.right = 'auto';
            element.style.zIndex = '9999';
            document.body.appendChild(element);
        }
        
        // --- LISTENERS ---
        
        // 1. ADD THIS: Trigger Lazy Init on Hover
        // This ensures the effectsDiv exists so the "glow" and "arrows" work 
        // the moment you hover, without waiting for a click.
        element.addEventListener('mouseenter', () => this.lazyInit(element));

        element.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        element.addEventListener('dragstart', (e) => e.preventDefault());
        
        // Touchscreen Support
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e), {passive: false});
        element.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), {passive: false});

        // Prevent clicks during drag
        element.addEventListener('click', (e) => {
            if (this.dragStarted) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        }, true);
        
        // Restore session position if exists
        if (element.id && sessionStorage.getItem("ktwp-de-elem-"+element.id+"-x")) {
            const absoluteX = sessionStorage.getItem("ktwp-de-elem-"+element.id+"-x");
            const absoluteY = sessionStorage.getItem("ktwp-de-elem-"+element.id+"-y");
            const absoluteR = sessionStorage.getItem("ktwp-de-elem-"+element.id+"-r");
            const absoluteB = sessionStorage.getItem("ktwp-de-elem-"+element.id+"-b");
                                                                                   
            // We manually trigger the setup logic here for restored items
            this.handleMouseDown({ 
                button: 0, 
                target: element,
                clientX: 0, 
                clientY: 0, 
                preventDefault: () => {} 
            });
                                                                   
            this.handleMouseUp({ 
                button: 0, 
                target: element,
                clientX: absoluteX,
                clientY: absoluteY,
                preventDefault: () => {}, 
                simulated: true 
            });
            
            element.style.left = absoluteX;
            element.style.top = absoluteY;    
            element.style.right = absoluteR;
            element.style.bottom = absoluteB;    
            element.classList.add('ktwp-de-beenDragged');
        }
    }

    // Lazy initialization of DOM heavy items (Effects Div) and Computed Styles (Rects)
    lazyInit(element) {
        if (element.getAttribute('data-ktwp-initialized') === 'true') return;

        const config = element.draggableConfig;
        
        // Calculate Rects NOW (closest to interaction time)
        // This solves your issue where CSS loads late and changes dimensions/positions
        const rect = element.getBoundingClientRect();
      
        element.setAttribute('ktwp-de-rect-height', rect.height);
        element.setAttribute('ktwp-de-rect-width', rect.width);
        element.setAttribute('ktwp-de-rect-x', rect.x + (getComputedStyle(element)["display"] == 'fixed' ? 0 : window.scrollX)); 
        element.setAttribute('ktwp-de-rect-y', rect.y + (getComputedStyle(element)["display"] == 'fixed' ? 0 : window.scrollY));

        // Create the Effects Div
        if ((config.hasOwnProperty("dragElement") && config.dragElement != '') || !config.hasOwnProperty("dragElement")) {
            const theDragElement = config.hasOwnProperty("dragElement") ? element.querySelector(config.dragElement) : element;
            
            const newDiv = document.createElement("div");
            newDiv.className = "ktwp-de-effectsDiv";
            theDragElement.prepend(newDiv);
            
            // Set position relative if static, so the effects div positions correctly
            if (getComputedStyle(theDragElement).position == "static") {
                element.style.position = "relative";
            }
        }
        
        // Note: Corner logic was moved back to makeDraggable to prevent "jumping"

        element.setAttribute('data-ktwp-initialized', 'true');
    }
    handleMouseDown(e) {
        if (e.button !== 0) return;
        
        const element = e.target.closest('[data-draggable]');
        if (!element) return;

        // Perform lazy initialization (position:relative check, effectsDiv creation) now
        this.lazyInit(element);

        e.preventDefault();
		
		
        
        // const element = e.target.closest('[data-draggable]'); // Already found above
        // if (!element) return; // Already checked
        
/* copied from makedraggable; let's do these when clicked, not at load. */
		const rect = element.getBoundingClientRect();
/* begin gemini fix for "jump" when assumed to be cllicking in middle */
		this.offsetX = e.clientX - rect.left; 
this.offsetY = e.clientY - rect.top;
	
		
		/* end gemini fix for "jump" when assumed to be cllicking in middle */

		if (getComputedStyle(element).position != 'fixed' && getComputedStyle(element).position != 'absolute' /*previously used element.style.position, but this doesn't pick up attributes defined in css stylesheets, only on the element. */ ) {
			
			var newNode = document.createElement("div");
			var nodeUUID="10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  ); /* courtesy https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid */
			newNode.id=nodeUUID;
			newNode.style.margin = getComputedStyle(element)["margin"];
			newNode.style.top = rect.top+"px";
			newNode.style.left = rect.left+"px";
			newNode.style.height = rect.height+"px";
			newNode.style.width = rect.width+"px";
			newNode.style.opacity = '0';
			newNode.setAttribute('data-draggable-placeholder', 'true');
			element.setAttribute('ktwp-de-placeholderId', nodeUUID); /* TO DO: In case I later on I want the reset function to remove the placeholder and put this element back where it was with the original display instead of just positioning it back over the original location. Use this to do it. */
			element.parentNode.insertBefore(newNode,element);
		}

        
       
	if (newNode || (getComputedStyle(element).position == 'absolute')  /* position wasn't fixed - still need to do this for absolute too, or they stay positioned relative to the parent element, and if that's draggable too and been moved, then they "jump" and position themselves wrong when released once dragged. need to be positioned fixed. */ )
	{
		element.style.left = rect.left+"px";element.style.top = rect.top+"px"; 
		element.style.position = 'fixed';
		element.style.margin="0"/*otherwise jumps when you touch it */;
		document.body.appendChild(element);/* if the element wasn't fixed, move it to a child of the body, because CSS transforms on an ancestor (or similar things) can create a new stacking context, and "fixed at 0,0" follows the stacking context root element, not necessarily the body. If it was already fixed, we'll leave it to the original page code to put it in the context it should be in. */ 
	}

/* END copied from makedraggable */




        this.activeElement = element;
        this.isDragging = true;
        this.dragStarted = false;
       
      //  console.log('Drag started for:', element, 'constraint:', element.draggableConfig.constraint);
        
        // Add event listeners
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
       /* Originally I always set the z-index to 9999, back when objects stayed position 'fixed' after dragging and didn't scroll with the page. But nah, we just won't set the zIndex at all, so we don't have to reset it on mouseup. Otherwise, could have a situation where it disappears behind something on mouseup; but without setting it, could scroll over page header. This way, it's developer's job to set Z index properly on element, not plugin's job to make assumptions. 

HOWEVER: The exception to this is the corner snap. Because this will "snap" to a corner after you release, it is possible to drag it, still have it be visible, and then on release have it disappear behind, say, a page header or menu heading and have it be irretrievable. So we'll assume corner-snapped elements always stay in front. BUT, we'll do that where the original corner is set up in makeDraggable.
 element.style.zIndex = '9999'; */
        element.classList.add('is-dragging');
       //no don't need it: element.classList.add('is-held-draggable'); // Add this line for the visual indicator
    }

    // --- New Touch Event Handlers ---
    /* old handlers didn't actually work on mobile, something about preventDefault. Keeping around for now for reference, I want to compare and see what the actual problem was. 
OLD_didnt_work_on_mobile_handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling and zooming
        const touch = e.touches[0];
		
		
    // --- START CHANGES TO PREVENT TRIGGERING DRAG ON VANISHINGLY TINY TOUCHES, like can happen on mobile---
    // Store the initial touch coordinates for threshold calculation
   
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    // --- END CHANGES ---

    // Simulate a mouse down event for reusability.
    // This will set `this.dragStarted = false;` initially, which is what we want.
 
        this.handleMouseDown({
            button: 0, // Left click
            target: touch.target,
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {} // Dummy preventDefault
        });
        const element = e.target.closest('[data-draggable]');
       // no don't need it if (element) { element.classList.add('is-held-draggable'); } // Add this line for the visual indicator
     
    }

    OLD_didnt_work_on_mobile_handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        if (!this.activeElement || !this.isDragging) return;
        const touch = e.touches[0];
		
		
		
    // --- START CHANGES: ADD THESE LINES to prevent vanishingly small touches from triggering a drag, as can happen on mobile ---
    // Calculate the distance moved from the initial touch point
    const currentTouchX = touch.clientX;
    const currentTouchY = touch.clientY;
    const deltaX = Math.abs(currentTouchX - this.touchStartX);
    const deltaY = Math.abs(currentTouchY - this.touchStartY);

    // If the movement exceeds the threshold, only then set dragStarted and proceed with movement
    if (deltaX > this.touchMovementThreshold || deltaY > this.touchMovementThreshold) {
        this.dragStarted = true; // Mark as a drag
    } else {
        // If movement is below threshold, ensure dragStarted remains false for potential click
        this.dragStarted = false;
        return; // Don't process movement if below threshold
    }
    // --- END CHANGES ---

    // Original logic that simulates a mouse move event, now only runs if dragStarted is true
   
        // Simulate a mouse move event
        this.handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY,
            movementX: touch.clientX - (this._lastTouchX || touch.clientX), // Estimate movementX
            movementY: touch.clientY - (this._lastTouchY || touch.clientY), // Estimate movementY
            preventDefault: () => {}
        });
        this._lastTouchX = touch.clientX;
        this._lastTouchY = touch.clientY;
    }

    OLD_didnt_work_on_mobile_handleTouchEnd(e) {
        if (!this.activeElement) return;
        // Simulate a mouse up event
        this.handleMouseUp({
            clientX: this._lastTouchX,
            clientY: this._lastTouchY,
            preventDefault: () => {}
        });
        this._lastTouchX = null;
        this._lastTouchY = null;

         // Remove touch event listeners from the document
         document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
         document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
         document.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        // Ensure 'is-held-draggable' is removed on touch end
   // no don't need it anymore:     if (this.activeElement) { this.activeElement.classList.remove('is-held-draggable');} 
    }
END old handlers */
	
	
handleTouchStart(e) {
	
        const touch = e.touches[0];
	touch.target.classList.remove("ktwp-de-disablehover");
	
        if (e.touches.length !== 1) { // Only handle single-finger touches for dragging
            this.isTouchSequenceActive = false;
            return;
        }

e.stopPropagation();
        const element = touch.target.closest('[data-draggable]');

        if (!element) {
            this.isTouchSequenceActive = false;
            return;
        }

        this.isTouchSequenceActive = true;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.dragStarted = false; // Reset drag state for new touch sequence

        // REUSE existing handleMouseDown logic to prepare the element.
        // This avoids duplicating all the placeholder/fixed positioning code.
        this.handleMouseDown({
            button: 0, // Simulate left click button
            target: element,
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {} // Provide a dummy preventDefault
        });
    }

handleTouchMove(e) {
        if (!this.activeElement || !this.isDragging || !this.isTouchSequenceActive || e.touches.length !== 1) {
            return;
        }

        const touch = e.touches[0];
        const currentTouchX = touch.clientX;
        const currentTouchY = touch.clientY;

        const deltaX = Math.abs(currentTouchX - this.touchStartX);
        const deltaY = Math.abs(currentTouchY - this.touchStartY);

        if (!this.dragStarted) { // Only decide if it's a drag if it hasn't been confirmed yet
            if (deltaX > this.touchMovementThreshold || deltaY > this.touchMovementThreshold) {
                this.dragStarted = true; // Confirmed as a drag
                // PREVENT DEFAULT HERE: This suppresses the click event for this confirmed drag.
                e.preventDefault();
				this.activeElement.classList.add("ktwp-de-disablehover"); /* so hover state doesn't trigger after drag */
/* see if removig this ruins ios drag				e.stopImmediatePropagation(); */
                // console.log('AdvancedDraggable: Touch movement exceeded threshold. Drag confirmed and default prevented (to suppress click).');
            } else {
                // Not enough movement yet to be a drag. DO NOT preventDefault().
                // This allows the browser to interpret it as a tap and fire a native click.
                // console.log('AdvancedDraggable: Touch movement still below threshold. Not a drag, default NOT prevented.');
                return; // Stop processing further touchmove if not a confirmed drag
            }
        } else {
            // If already confirmed as a drag, continue preventing default.
            e.preventDefault();
		/* see if removig this ruins ios drag			e.stopImmediatePropagation(); */
            // console.log('AdvancedDraggable: Continuing drag. Default prevented.');
        }

        // Reuse handleMouseMove for actual element positioning
        const simulatedMouseEvent = {
            clientX: currentTouchX,
            clientY: currentTouchY,
            movementX: currentTouchX - (this._lastTouchX !== undefined ? this._lastTouchX : currentTouchX),
            movementY: currentTouchY - (this._lastTouchY !== undefined ? this._lastTouchY : currentTouchY),
            preventDefault: () => {}
        };
        this.handleMouseMove(simulatedMouseEvent);
        this._lastTouchX = currentTouchX; // Store current position for next movement calculation
        this._lastTouchY = currentTouchY;
    }
	handleTouchEnd(e) {

        if (!this.activeElement || !this.isTouchSequenceActive) return;

        this.isTouchSequenceActive = false; // End the active touch sequence
        this._lastTouchX = undefined; // Clear last touch position
        this._lastTouchY = undefined;

        // Reuse handleMouseUp for common cleanup.
        // This is where common cleanup logic should be centralized.
        this.handleMouseUp(e);
    }
    // --- End New Touch Event Handlers ---

  handleMouseMove(e) {
    if (!this.activeElement || !this.isDragging) return;

    if (!this.dragStarted) {
        this.dragStarted = true;
        this.activeElement.classList.add('ktwp-de-beenDragged');
    }

    // Store the last known position from the event.
    this.lastPosition.x = e.clientX;
    this.lastPosition.y = e.clientY;

    // Check if an update is already pending. If not, request a new animation frame.
    if (!this.pendingUpdate) {
        this.pendingUpdate = true;
        this.nextFrame = requestAnimationFrame(() => this.updateElementPosition());
    }
}

updateElementPosition() {
    if (!this.activeElement || !this.isDragging) {
        this.pendingUpdate = false;
        this.nextFrame = null;
        return;
    }

    const { x, y } = this.lastPosition;
    const config = this.activeElement.draggableConfig;

    if (config.constraint === 'vertical') {
        this.handleVerticalMovement({ clientY: y });
    } else if (config.constraint === 'horizontal') {
        this.handleHorizontalMovement({ clientX: x });
    } else if (config.constraint === 'corners') {
        // The corners constraint allows free dragging and then snaps on mouseup.
        // So, we treat it like 'free' movement during the drag.
        this.handleFreeMovement({ clientX: x, clientY: y });
    } else {
        // This is the default 'free' movement.
        this.handleFreeMovement({ clientX: x, clientY: y });
    }

    this.pendingUpdate = false;
    this.nextFrame = null;
}
    handleCornerMovement(e) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = this.activeElement.draggableConfig.cornerMargin || 25;
        
       // const rect = this.activeElement.getBoundingClientRect();
        const elementWidth = this.activeElement.getAttribute('ktwp-de-rect-width'); //rect.width
        const elementHeight = this.activeElement.getAttribute('ktwp-de-rect-height'); //rect.height
        
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        this.activeElement.style.position = 'fixed';
        // Determine which corner based on mouse position
        if (e.clientX < centerX && e.clientY < centerY) {
            // Top-left
            this.activeElement.style.left = margin + 'px';
            this.activeElement.style.top = margin + 'px';
            this.activeElement.style.right = 'auto';
            this.activeElement.style.bottom = 'auto';
        } else if (e.clientX >= centerX && e.clientY < centerY) {
            // Top-right
            this.activeElement.style.right = margin + 'px';
            this.activeElement.style.top = margin + 'px';
            this.activeElement.style.left = 'auto';
            this.activeElement.style.bottom = 'auto';
        } else if (e.clientX < centerX && e.clientY >= centerY) {
            // Bottom-left
            this.activeElement.style.left = margin + 'px';
            this.activeElement.style.bottom = margin + 'px';
            this.activeElement.style.right = 'auto';
            this.activeElement.style.top = 'auto';
        } else {
            // Bottom-right
            this.activeElement.style.right = margin + 'px';
            this.activeElement.style.bottom = margin + 'px';
            this.activeElement.style.left = 'auto';
            this.activeElement.style.top = 'auto';
        }
    }

     handleFreeMovement(e) {
        const viewportHeight = window.innerHeight;
        const rect = this.activeElement.getBoundingClientRect();
        const elementHeight = rect.height;
        
        // Keep horizontal position, only change vertical
        let newY = e.clientY - this.offsetY; //(elementHeight / 2); caused "jump" because assumed always clicked in center; caused very large draggables to have problems
        newY = Math.max(0, Math.min(newY, viewportHeight - elementHeight));
        
        this.activeElement.style.position = 'fixed';
        this.activeElement.style.top = newY + 'px';
        this.activeElement.style.bottom = 'auto';
       
	    const viewportWidth = window.innerWidth;
        const elementWidth = rect.width;
        
        // Keep horizontal position, only change vertical
        let newX = e.clientX - this.offsetX; //(elementWidth / 2); caused "jump" because assumed always clicked in center; caused very large draggables to have problems
        newX = Math.max(0, Math.min(newX, viewportWidth - elementWidth));
        
        this.activeElement.style.left = newX + 'px'; 
	    this.activeElement.style.right = 'auto';
       
    }

	 handleVerticalMovement(e) {
        const viewportHeight = window.innerHeight;
        const rect = this.activeElement.getBoundingClientRect();
        const elementHeight = rect.height;
        
        // Keep horizontal position, only change vertical
        let newY = e.clientY - this.offsetY; //(elementHeight / 2); caused "jump" because assumed always clicked in center; caused very large draggables to have problems
        newY = Math.max(0, Math.min(newY, viewportHeight - elementHeight));
        
        if (this.activeElement.style.position != 'fixed') {this.activeElement.style.left = rect.left+'px'; /* otherwise will jump when set to fixed, if page has been scrolled */}
		 
		this.activeElement.style.position = 'fixed';
        this.activeElement.style.top = newY + 'px';
        this.activeElement.style.bottom = 'auto';
        // Don't change left/right positioning
    }

	
    handleHorizontalMovement(e) {
        const viewportWidth = window.innerWidth;
        const rect = this.activeElement.getBoundingClientRect();
        const elementWidth = rect.width;
        
        // Keep horizontal position, only change vertical
        let newX = e.clientX - this.offsetX; //(elementWidth / 2); caused "jump" because assumed always clicked in center; caused very large draggables to have problems
        newX = Math.max(0, Math.min(newX, viewportWidth - elementWidth));
				//console.log("AAA this.activeElement.style.position",this.activeElement.style.position,"rect.top",rect.top,"this.activeElement.style.top",this.activeElement.style.top);
        if (this.activeElement.style.position != 'fixed') {this.activeElement.style.top = rect.top+'px'; /* otherwise will jump when set to fixed, if page has been scrolled */}
        this.activeElement.style.position = 'fixed';
		
		//console.log("BBB this.activeElement.style.position",this.activeElement.style.position,"rect.top",rect.top,"this.activeElement.style.top",this.activeElement.style.top);
        this.activeElement.style.left = newX + 'px';
		this.activeElement.style.right = 'auto';

        // Don't change left/right positioning
    }

	
    handleMouseUp(e) {
        if (!this.activeElement) return;
				//begin additions for animation frames
		  // Cancel any pending animation frame
    if (this.nextFrame) {
        cancelAnimationFrame(this.nextFrame);
        this.nextFrame = null;
    }
    this.pendingUpdate = false;
    
    this.offsetX = null;
    this.offsetY = null;
		//end additions for animation frames
        this.offsetX = null;
this.offsetY = null;

        //console.log('Drag ended');
        //
         const config = this.activeElement.draggableConfig;
			this.deltaX = "";
			this.deltaY = "";
		
        	const rect = this.activeElement.getBoundingClientRect();
				const absoluteX = rect.left + window.scrollX;
                const absoluteY = rect.top + window.scrollY;
		
        if (config.constraint === 'corners') { 
            this.handleCornerMovement(e);
		} else 
			{/* let's make it absolute on mouseup so scrolls with page, if not corner-constrained and wasn't fixed to begin with */
				if (this.activeElement.getAttribute("data-ktwp-de-position")!="fixed" )
				{   
			
				this.activeElement.style.left = absoluteX + 'px';
				this.activeElement.style.top = absoluteY + 'px';
				this.activeElement.style.position="absolute";
				/* nah, we just won't set the zIndex at all this.activeElement.style.zIndex=this.activeElement.getAttribute("data-ktwp-de-zIndex");	*/
					
				}
			}
        if (this.activeElement.id && !e.simulated) {/*if the element has an ID and is not fixed or corner-constrained, store absolute X & Y */ 
			sessionStorage.setItem("ktwp-de-elem-"+this.activeElement.id+"-x",this.activeElement.style.left);
			sessionStorage.setItem("ktwp-de-elem-"+this.activeElement.id+"-y",this.activeElement.style.top);
					sessionStorage.setItem("ktwp-de-elem-"+this.activeElement.id+"-r",this.activeElement.style.right);
			sessionStorage.setItem("ktwp-de-elem-"+this.activeElement.id+"-b",this.activeElement.style.bottom);}
        this.activeElement.classList.remove('is-dragging');
     //no don't need it:   this.activeElement.classList.remove('is-held-draggable'); // Remove this line for the visual indicator
       /* this.activeElement.style.zIndex = ''; No, let's leave it in front, so it's not possible to drag it behind something else accidentally */
        
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
        const element = this.activeElement;
		
	
		
        this.activeElement = null;
        this.isDragging = false;
        
        // Clear drag started flag after a delay to prevent immediate clicks
        setTimeout(() => {
            this.dragStarted = false;
        }, 100);
        
        // Dispatch custom event - IS THIS USED?
        const rectNew = element.getBoundingClientRect(); /* Is this different from rect? TO DO: add logging to check. */
        const event = new CustomEvent('draggableElementMoved', {
            detail: {
                element: element,
                position: {
                    x: rectNew.left,
                    y: rectNew.top
                },
                constraint: element.draggableConfig.constraint
            }
        });
        document.dispatchEvent(event);
    }
}

// Initialize with the config provided by WordPress
//console.log('Draggable script loaded');
//console.log('draggableSettings:', typeof draggableSettings !== 'undefined' ? draggableSettings : 'undefined');

if (typeof draggableSettings !== 'undefined' && draggableSettings.config) {
    //console.log('Initializing AdvancedDraggable with config:', draggableSettings.config);
    new AdvancedDraggable(draggableSettings.config);
} else {
    //console.error('draggableSettings not found or invalid');
}
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
		
       const rect = element.getBoundingClientRect();
      
       element.setAttribute('ktwp-de-rect-height',  rect.height);
       element.setAttribute('ktwp-de-rect-width',  rect.width);
		element.setAttribute('ktwp-de-rect-x',  rect.x +  getComputedStyle(element)["display"] =='fixed'?0:window.scrollX);
		element.setAttribute('ktwp-de-rect-y',  rect.y +  getComputedStyle(element)["display"] =='fixed'?0:window.scrollY);
        element.setAttribute('data-draggable', 'true');
		element.setAttribute('data-ktwp-de-position', getComputedStyle(element)["position"])
	/* nah, we just won't set the zIndex at all 	element.setAttribute('data-ktwp-de-zIndex', getComputedStyle(element)["zIndex"]) */
        element.style.cursor = 'move';
        element.style.userSelect = 'none';
		const constraintDesc= {"vertical":{"desc":"vertically","class":"vdrag"},"horizontal":{"desc":"horizontally","class":"hdrag"},"corners":{"desc":"to any corner","class":"cdrag"}};
		
		element.title=(element.title?element.title+" - ":"")+"☝ Drag me "+(constraintDesc[config.constraint]&&constraintDesc[config.constraint].desc?constraintDesc[config.constraint].desc+" ":"")+"to reposition!";
		if (constraintDesc[config.constraint]&&constraintDesc[config.constraint].class) { element.classList.add("ktwp-de-"+constraintDesc[config.constraint].class);}
		/* if I decide to make all children use move cursor, do this. const descendents = element.querySelectorAll("*"); /~ yes, I know how it's spelled. Ask Milo. ~/ */
        
        // For corner constraint, pre-position to a corner
        if (config.constraint === 'corners') {
            const margin = config.cornerMargin || 25;
            element.style.position = 'fixed';
            element.style.left = margin + 'px';
            element.style.bottom = margin + 'px';
            element.style.top = 'auto';
            element.style.right = 'auto';
			element.style.zIndex = '999999'; /* moved from handleMouseDown just for corner-snapped elements; see not about it in that function. Ideally, eventually, it should check if the developer has set this with getComputedStyles and only assign it if not; but I don't need that level of detail right now, so, will procrastinate on it. */
		    document.body.appendChild(element)
        } 
		
        element.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        element.addEventListener('dragstart', (e) => e.preventDefault());
        
        // --- Touchscreen Support ---
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        element.addEventListener('touchcancel', (e) => this.handleTouchEnd(e)); // handle when a touch is interrupted

        // Prevent clicks during drag
        element.addEventListener('click', (e) => {
            if (this.dragStarted) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        }, true); //end prevent clicks
		
	if (element.id && sessionStorage.getItem("ktwp-de-elem-"+element.id+"-x")) {const absoluteX=sessionStorage.getItem("ktwp-de-elem-"+element.id+"-x");
						const absoluteY=sessionStorage.getItem("ktwp-de-elem-"+element.id+"-y");
																				const absoluteR=sessionStorage.getItem("ktwp-de-elem-"+element.id+"-r");
						const absoluteB=sessionStorage.getItem("ktwp-de-elem-"+element.id+"-b");
			//console.log("ss",sessionStorage);																   
			 this.handleMouseDown({ /* prepare element for dragging (create placeholder if nec, etc) */
            button: 0, // Left click
            target: element,
            clientX: rect.left,
            clientY: rect.top,
            preventDefault: () => {} // Dummy preventDefault
        });
								//console.log("ss2",sessionStorage);														
								//console.log("element",element.id);
																				//console.log("X,Y",absoluteX,absoluteY);
																   
				this.handleMouseUp({ /* prepare element for dragging (create placeholder if nec, etc) */
            button: 0, // Left click
            target: element,
            clientX: absoluteX,
            clientY: absoluteY,
            preventDefault: () => {}, // Dummy preventDefault
			simulated: true /*tell function it's a simulated mouseup so it doesn't store coords */

        });
							//console.log("ss3",sessionStorage);
			
			element.style.left=absoluteX;
		element.style.top=absoluteY;	
			element.style.right=absoluteR;
		element.style.bottom=absoluteB;	
		}
    }

    handleMouseDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        
        const element = e.target.closest('[data-draggable]');
        if (!element) return;
        
/* copied from makedraggable; let's do these when clicked, not at load. */
		 const rect = element.getBoundingClientRect();
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

        
       
	if (newNode || (getComputedStyle(element).position == 'absolute')  /* position wasn't fixed - still need to do this for absolute or they stay positioned relative to the parent element, and if that's draggable too and been moved, then they "jump" and position themselves wrong when released. Once dragged, need to be fixed. */ )
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
        
       /* Originally I always set the z-index to 999999, back when objects stayed position 'fixed' after dragging and didn't scroll with the page. But nah, we just won't set the zIndex at all, so we don't have to reset it on mouseup. Otherwise, could have a situation where it disappears behind something on mouseup; but without setting it, could scroll over page header. This way, it's developer's job to set Z index properly on element, not plugin's job to make assumptions. 

HOWEVER: The exception to this is the corner snap. Because this will "snap" to a corner after you release, it is possible to drag it, still have it be visible, and then on release have it disappear behind, say, a page header or menu heading and have it be irretrievable. So we'll assume corner-snapped elements always stay in front. BUT, we'll do that where the original corner is set up in makeDraggable.
 element.style.zIndex = '999999'; */
        element.classList.add('is-dragging');
       //no don't need it: element.classList.add('is-held-draggable'); // Add this line for the visual indicator
    }

    // --- New Touch Event Handlers ---
    handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling and zooming
        const touch = e.touches[0];
        // Simulate a mouse down event for reusability
        this.handleMouseDown({
            button: 0, // Left click
            target: touch.target,
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {} // Dummy preventDefault
        });
        const element = e.target.closest('[data-draggable]');
       /* no don't need it
 if (element) {
            element.classList.add('is-held-draggable'); // Add this line for the visual indicator
        } */
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        if (!this.activeElement || !this.isDragging) return;
        const touch = e.touches[0];
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

    handleTouchEnd(e) {
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
   /* no don't need it:     if (this.activeElement) {
            this.activeElement.classList.remove('is-held-draggable');
        } */
    }
    // --- End New Touch Event Handlers ---

    handleMouseMove(e) {
        if (!this.activeElement || !this.isDragging) return;
        
        if (!this.dragStarted) {
            this.dragStarted = true;
			
        }
		if (this.deltaX==this.deltaY && this.deltaX==0)
		{this.deltaX = e.movementX;
			this.deltaY = e.movementY;
			}
        
        const config = this.activeElement.draggableConfig;
        
        if (config.constraint === 'Xcorners') { //disabling, will do this on mouseup
			//this.handleCornerMovement(e) NOT ANYMORE
            if (e.deltaX > e.deltaY) { this.handleHorizontalMovement(e);} else { this.handleVerticalMovement(e);} 
        } else if (config.constraint === 'vertical') {
            this.handleVerticalMovement(e);
        } else if (config.constraint === 'horizontal') {
            this.handleHorizontalMovement(e);
        } else  {
            this.handleFreeMovement(e);
        }
        // Add other constraint types here if needed
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
        let newY = e.clientY - (elementHeight / 2);
        newY = Math.max(0, Math.min(newY, viewportHeight - elementHeight));
        
        this.activeElement.style.position = 'fixed';
        this.activeElement.style.top = newY + 'px';
        this.activeElement.style.bottom = 'auto';
       
	    const viewportWidth = window.innerWidth;
        const elementWidth = rect.width;
        
        // Keep horizontal position, only change vertical
        let newX = e.clientX - (elementWidth / 2);
        newX = Math.max(0, Math.min(newX, viewportWidth - elementWidth));
        
        this.activeElement.style.left = newX + 'px'; 
	    this.activeElement.style.right = 'auto';
       
    }

	 handleVerticalMovement(e) {
        const viewportHeight = window.innerHeight;
        const rect = this.activeElement.getBoundingClientRect();
        const elementHeight = rect.height;
        
        // Keep horizontal position, only change vertical
        let newY = e.clientY - (elementHeight / 2);
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
        let newX = e.clientX - (elementWidth / 2);
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

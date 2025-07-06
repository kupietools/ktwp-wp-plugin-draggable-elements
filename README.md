# ktwp-wp-plugin-draggable-elements

A WordPress plugin to make any page elements draggable, with optional movement constraints.

## Introduction

As I loaded up my personal website [Kupietz Arts+Code](https://michaelkupietz.com) with all sorts of custom plugins and gewgaws, a number of html/javascript floating elements were added to it: a floating palette begging readers to [hire me](https://michaelkupietz.com/hire-mike-filemaker-web-development/), and control tabs for my [KupieTools Page Appearance Adjuster](https://github.com/kupietools/ktwp-wp-plugin-page-appearance-adjuster) and ["Expert Mode" CLI-based website navigation](https://github.com/kupietools/web-CLI-browser), with more to come. While these looked terrific on my computer screen, I soon discovered to my shock and horror that on my tiny, little iPhone SE screen, these added elements covered up vital page content. 

The obvious solution: make them draggable, so the user could push them out of the way. 

![image](https://github.com/user-attachments/assets/dc975e89-c9c6-4953-9ff2-93a5bb283648)

The problem was, I already had a few plugins I'd have to alter to do this, and expected a few more to come soon, and I didn't want to have to record draggability over and over again.

Hence, the present plugin, which allows you to easily make existing web page elements draggable. 


## Audience

Owing to a reliance on CSS selectors and HTML element attributes, this plugin is much more easily usable by people with some web development experience. If you did not understand that sentence, you probably will have a hard time using it, sorry.

## Description

This is a WordPress plugin that allows you to specify existing elements on a WordPress-generated page and instruct it to make them interactively draggable by the user. Then the user can drag them with their mouse (or finger on mobile) to reposition them onscreen.

It is possible to configure each individual element to be freely draggable in any direction, constrained vertically only, horizontally only, or to snapped to the closest window corner, with a configurable margin in the latter case. 

Draggable elements may be scrollable with the page. The only exception is elements originally CSS positioned with `fixed`, or elements snapped to window corners.

Some elements will snap to last user-dragged position on subsequent page loads in the same window, even navigation to other pages on the same site. This is possible if the original element has an "ID" attribute. The positions are stored by site+tab, so opening the same site in a different tab will not remember the positions.

When the mouse is pressed on it, a draggable element will display a translucent overlay showing the directions it can be dragged in, and a slight shimmering "rainbow glow" effect around the element so that you know it's magic. 

### Demo

This plugin has a work-in-progress demonstration page at [Draggable Elements WordPress Plugin | Kupietz Arts+Code](https://michaelkupietz.com/?p=29809).

## Instructions

Install and activate this plugin as normal in WordPress.

### Making Elements Draggable

There are two ways to make elements draggable:

**1.) Add one of the plugin's predefined classes to the element's "class" attribute**    
**2.) Add a CSS selector identifying the element(s) to the array `$draggable_config` in the main `ktwp-draggable-elements.php` file.**

#### 1. Predefined classes:

The predefined classes you can assign to elements in your page are:
- fdrag: make the element freely draggable. 
- vdrag: make the element vertically draggable only.
- hdrag: make the element horizontally draggable only.
- cdrag: allow the element to be freely dragged while dragging, but when released, snap it to the nearest corner of the window, 25 pixels from each side.
- drag *[unordered list elements only]*: when added to an HTML `UL` element, this class makes its direct child `LI` elements freely draggable. Useful for creating tear-off menus.

You can dynamically add the above CSS classes to any page element in your browser's Inspector, and it will immediately turn that element draggable, as if the element contained the class at page load. This has no practical application whatsoever but is a fun demo.

*As this plugin is in alpha, these class names, like anything else in this document, may change in future versions.*

#### 2. Adding CSS selectors to $draggable_config:

`$draggable_config` is an multidimensional array in the main php file... an array of associative arrays. Each item in the array is an associative array, consisting of between one and three keys:
- **"selector" [required value]** A css selector. Any page elements matching this selector will become freely draggable, unless a "constraint" key is added.
- **"constraint" [optional value: "horizontal", "vertical", or "corners"]** A direction or position to constrain the element's draggability to.
- **"cornerMargin" [optional: integer]** If "constraint" is "corners", the number of pixels from the nearest sides to place the corner-constrained elements. If this key is not included, default value is 25.

`ktwp-draggable-elements.php` contains documented examples in the `$draggable_config` definition. 

### Gotchas

1. It is entirely possible to drag an item behind something else, even a transparent or hard-to-see element on the page, and then not be able to click on it again to move it out. At some point I will incorporate some sort of "reset position" feature, but I haven't figured out the best way to do this yet. 
  
## Undocumented stuff

TBD. (This documentation is still in alpha, too.) There are a lot of idiosyncrasies to how this plugin works, because it has to work with all kinds of existing HTML. I will document these here. 

Reminders to myself: different handling of originally `fixed` elements, z-index, corner dragged elements being automatically positioned on load, details of sessionStorage, errata about currently using a clip path for the magic rainbow glow effect because of zIndex unpredictability, etc

## Technical Description

TBD. Someday I will include detailed technical description here of how this plugin works its magic. 

The quick answer is it adds listeners to everything with a CSS selector defined in its config, to detect touches and drags. It has special cases for elements in `fixed` position or that will be constrained to corners, but the general case for other than those is that when dragged, the plugin puts an invisible placeholder element in the positions of the original element, moves the element to be a child of the `body` tag to avoid CSS stacking context idiosyncrasies, and makes its display `fixed` to make it easy to use javascript clientBoundingRect to manage its position. When the drag is done, the display is changed to absolute, with positioning attributes calculated and set so it does not move visually, but can then scroll with the page. Elements that are originally `fixed`, or set to `fixed` on page load like corner-constrained elements, don't require as much management and are just moved by tracking mouse movement deltas. 

## Notes

1. This plugin is currently in alpha. New features are yet to be added. Existing functionality may change, break, or disappear.    
2. As of this writing (2025 july 6) the javascript and css that run this plugin are not WordPress-specific. Anyone so inclined could easily take the config array from the PHP file, move it into the javascript file, and adapt this with very little work to run on any site. However, if you're coding a site by hand and not with a page builder like WordPress, it's not very efficient to retrofit draggability onto existing elements. It would be better to author them that way from the start.    
3. I do plan to include WordPress-specific features like a settings screen so the user doesn't have to specify the config in the code. However, these will be contained in the PHP file and will not be necessary for the basic front-end functioning of the plugin, they will just be niceties for WordPress users.    
4. I am open to feature requests or pull requests. As this is a hobby project that I don't want to incur too much administrative debt on, whether I will accept and implement them is a different question, but I'm willing to consider them.     


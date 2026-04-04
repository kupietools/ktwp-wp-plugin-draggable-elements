<?php
/*
 * Plugin Name: KupieTools Draggable Elements
 * Plugin URI:        https://michaelkupietz.com/
 * Description:       Make page elements draggable, with optional movement constraints.
 * Version:           1
 * Requires at least: 6.3
 * Requires PHP:      7.2
 * Author:            Michael Kupietz
 * Author URI:        https://michaelkupietz.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Update URI:        https://michaelkupietz.com/my-plugin/kupietools-draggable-elements/
 * Text Domain:       mk-plugin
 * Domain Path:       /languages
 */


/**
 * Your code goes below.
 */

//prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class AdvancedDraggableElements {

    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        // REMOVED: add_action('wp_enqueue_scripts', array($this, 'enqueue_styles')); 
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            'draggable',
            plugin_dir_url(__FILE__) . 'js/draggable.js',
            array(),
            '1.0.0',
            array(
            'strategy'  => 'defer', /* added for performance. Now requires WP 6.3 */
            'in_footer' => true
        )
        );



        // NEW: Enqueue the CSS file directly
     /*   wp_enqueue_style(
            'draggable-styles',
            plugin_dir_url(__FILE__) . 'css/draggable.css', // Point to your CSS file
            array(),
            '1.0.0'
        ); */

        // Configuration - edit this array as needed

        $draggable_config = array(
            /* for every element you want to make draggable, 
            add a sub-array line to $draggable_config: 

            array('selector' => 'CSSSelector' [, 
                  'constraint' => 'corners|vertical|horizontal', 
                  'cornerMargin' => marginInPx, // corners only 
				  'dragElement' => 'Child Element CSS selector', //have to test, don't recall what this does!!
			'scrollable' => 'true' // a hint that the draggable element is also itself scrollable, like a scrollable div... otherwise the draggability "swallows" the scrollability on mobile. Technically, this changes touch-action from none to pan-y. 
			]
                 ) 
                  */

            /* DEFAULTS - assign these classes to elements to make them draggable */
            array('selector' => '.cdrag','constraint' => 'corners', 'cornerMargin' => 25),
            array('selector' => '.vdrag','constraint' => 'vertical' ),
            array('selector' => '.hdrag','constraint' => 'horizontal' ),
            array('selector' => '.fdrag' ),

            /* CUSTOM - specific to michaelkupietz.com and other kupietools plugins; you'll want to changes these, unless you don't.  */
            array('selector' => '#page-adjuster-control','constraint' => 'vertical' ),
            array('selector' => '#cli-control, .ktwp-kupietabs-tab-div','constraint' => 'vertical' ),
            array('selector' => 'ul.drag > li'), 
            array('selector' => '.hire-floating-div, .ktwp-kupietabs-panel-div'),
			array('selector' => '.octagon-center'),
            array('selector' => '#ktwp_help_tab-panel', 'scrollable'=>'true')

/*NOTE: Typically if more than one selector matches an element, it will ONLY run the first and ignore the rest. The sole exception is if it has "scrollable"=>"true"... this selector will ALWAYS run, even on an element that a previous selector ran on. For this reason, it's best to have 'scrollable' last, after everything else that might match, and on its own line, with no other options. If scrollable runs first, it will prevent the later selector from running.*/

            /* EXAMPLES:
            array('selector' => 'body > div.blarg > div.gooph'), //free drag
            array('selector' => '#leftTab', 
                                'constraint' => 'vertical'),     //drag vertically
            array('selector' => '.my-draggable-box', 
                                'constraint' => 'horizontal'),   //drag horizontally
            array('selector' => 'div.groovy > div.splunge', 
                                'constraint' => 'corners', 
                                'cornerMargin' => 25),           //constrain to corners, 25px margin
            */

        );


        wp_localize_script('draggable', 'draggableSettings', array(
            'config' => $draggable_config,
        ));
    }
}

new AdvancedDraggableElements();

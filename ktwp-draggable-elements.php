<?php
/*
 * Plugin Name: KupieTools Draggable Elements
 * Plugin URI:        https://michaelkupietz.com/
 * Description:       Make page elements draggable, with optional movement constraints.
 * Version:           1
 * Requires at least: 5.2
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
            true
        );

        // NEW: Enqueue the CSS file directly
        wp_enqueue_style(
            'draggable-styles',
            plugin_dir_url(__FILE__) . 'css/draggable.css', // Point to your CSS file
            array(),
            '1.0.0'
        );

        // Configuration - edit this array as needed

        $draggable_config = array(
            /* for every element you want to make draggable, 
            add a sub-array line to $draggable_config: 

            array('selector' => 'CSSSelector' [, 
                  'constraint' => 'corners|vertical|horizontal', 
                  'cornerMargin' => marginInPx ] 
                 ) 
                  */

            /* DEFAULTS - assign these classes to elements to make them draggable */
            array('selector' => '.cdrag','constraint' => 'corners', 'cornerMargin' => 25),
            array('selector' => '.vdrag','constraint' => 'vertical' ),
            array('selector' => '.hdrag','constraint' => 'horizontal' ),
            array('selector' => '.fdrag' ),

            /* CUSTOM - specific to michaelkupietz.com */
            array('selector' => '#page-adjuster-control','constraint' => 'vertical' ),
            array('selector' => '#cli-control','constraint' => 'vertical' ),
            array('selector' => 'ul.drag > li'), 
            array('selector' => '.hire-floating-div') 

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
// ----------------------------------------------------------------------------------------------------
// ScrollMe
// A jQuery plugin for adding simple scrolling effects to web pages
// http://scrollme.nckprsn.com
// ----------------------------------------------------------------------------------------------------

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals
    factory(jQuery);
  }
}( function( $ )
{
	// ----------------------------------------------------------------------------------------------------
	// ScrollMe object

	var _this = {};

	// ----------------------------------------------------------------------------------------------------
	// Properties

	var $document = $( document );
	var $window = $( window );

	_this.body_height = 0;
    _this.body_width = 0;

	_this.viewport_height = 0;
    _this.viewport_width = 0;

	_this.viewport_top = 0;
	_this.viewport_bottom = 0;
    _this.viewport_left = 0;
    _this.viewport_right = 0;

	_this.viewport_top_previous = -1;
    _this.viewport_left_previous = -1;

	_this.elements = [];
	_this.elements_in_view = [];

	_this.property_defaults =
	{
		'opacity' : 1,
		'translatex' : 0,
		'translatey' : 0,
		'translatez' : 0,
		'rotatex' : 0,
		'rotatey' : 0,
		'rotatez' : 0,
		'scale' : 1,
		'scalex' : 1,
		'scaley' : 1,
		'scalez' : 1
	};

	_this.scrollme_selector = '.scrollme';
	_this.animateme_selector = '.animateme';

	_this.update_interval = 10;

    _this.fitTimeout = 0;

	// Easing functions

	_this.easing_functions =
	{
		'linear' : function( x )
		{
			return x;
		},

		'easeout' : function( x )
		{
			return x * x * x;
		},

		'easein' : function( x )
		{
			x = 1 - x;
			return 1 - ( x * x * x );
		},

		'easeinout' : function( x )
		{
			if( x < 0.5 )
			{
				return ( 4 * x * x * x );
			}
			else
			{
				x = 1 - x;
				return 1 - ( 4 * x * x * x ) ;
			}
		}
	};

	// Document events to bind initialisation to

	_this.init_events =
	[
		'load',
		'DOMContentLoaded',
		'page:load', // Turbolinks
		'page:change' // Turbolinks
	];

	// ----------------------------------------------------------------------------------------------------
	// Initialisation conditions

	_this.init_if = function() { return true; }

	// ----------------------------------------------------------------------------------------------------
	// Initialisation

	_this.init = function(options)
	{

        var opts = $.extend( {}, {
            direction:'vertical',
            update: function() {}
        }, options );

        _this.direction = opts.direction;
        _this.updateCallback = opts.update;
        _this.options = opts;

		// Cancel if initialisation conditions not met

		if( !_this.init_if() ) return false;

		// Load all elements to animate

		_this.init_elements();

		// Get element & viewport sizes

		_this.on_resize();

		// Recalculate heights & positions on resize and rotate

		$window.on( 'resize orientationchange' , function(){ _this.on_resize(); } );

		// Recalculate heights & positions when page is fully loaded + a bit just in case

		$window.on('load', function(){ setTimeout( function(){ _this.on_resize(); } , 100 ) });

		// Start animating

		setInterval( _this.update , _this.update_interval );

        // console.log("HUHU");

		return true;
	}

	// ----------------------------------------------------------------------------------------------------
	// Get list and pre-load animated elements

	_this.init_elements = function()
	{
		// For each reference element

		$( _this.scrollme_selector ).each( function()
		{
			var element = {};

			element.element = $( this );

			var effects = [];

			// For each animated element

			$( this ).find( _this.animateme_selector ).addBack( _this.animateme_selector ).each( function()
			{
				// Get effect details

				var effect = {};

				effect.element = $( this );

				effect.when = effect.element.data( 'when' );
				effect.from = effect.element.data( 'from' );
				effect.to = effect.element.data( 'to' );

				if( effect.element.is( '[data-crop]' ) )
				{
					effect.crop = effect.element.data( 'crop' );
				}
				else
				{
					effect.crop = true;
				}

				if( effect.element.is( '[data-easing]' ) )
				{
					effect.easing = _this.easing_functions[ effect.element.data( 'easing' ) ]
				}
				else
				{
					effect.easing = _this.easing_functions[ 'easeout' ];
				}

				// Get animated properties

				var properties = {};

				if( effect.element.is( '[data-opacity]' ) )    properties.opacity    = effect.element.data( 'opacity' );
                if( effect.element.is( '[data-startopacity]' ) )    properties.startopacity    = effect.element.data( 'startopacity' );
				if( effect.element.is( '[data-translatex]' ) ) properties.translatex = effect.element.data( 'translatex' );
				if( effect.element.is( '[data-translatey]' ) ) properties.translatey = effect.element.data( 'translatey' );
				if( effect.element.is( '[data-translatez]' ) ) properties.translatez = effect.element.data( 'translatez' );
				if( effect.element.is( '[data-rotatex]' ) )    properties.rotatex    = effect.element.data( 'rotatex' );
				if( effect.element.is( '[data-rotatey]' ) )    properties.rotatey    = effect.element.data( 'rotatey' );
				if( effect.element.is( '[data-rotatez]' ) )    properties.rotatez    = effect.element.data( 'rotatez' );
				if( effect.element.is( '[data-scale]' ) )      properties.scale      = effect.element.data( 'scale' );
				if( effect.element.is( '[data-scalex]' ) )     properties.scalex     = effect.element.data( 'scalex' );
				if( effect.element.is( '[data-scaley]' ) )     properties.scaley     = effect.element.data( 'scaley' );
				if( effect.element.is( '[data-scalez]' ) )     properties.scalez     = effect.element.data( 'scalez' );

				effect.properties = properties;

				effects.push( effect );
			});

			element.effects = effects;

			_this.elements.push( element );
		});
	}

	// ----------------------------------------------------------------------------------------------------
	// Update elements

	_this.update = function()
	{
		window.requestAnimationFrame( function()
		{
			_this.update_viewport_position();

            if(_this.direction == 'vertical') {
                if( _this.viewport_top_previous != _this.viewport_top )
                {
                    _this.update_elements_in_view();
                    _this.animate();
                }

                _this.viewport_top_previous = _this.viewport_top;
            } else {
                if( _this.viewport_left_previous != _this.viewport_left )
                {
                    _this.update_elements_in_view();
                    _this.animate();
                }

                _this.viewport_left_previous = _this.viewport_left;
            }

            _this.updateCallback();
        });
	}


	// ----------------------------------------------------------------------------------------------------
	// Animate stuff

	_this.animate = function()
	{
		// For each element in viewport

		var elements_in_view_length = _this.elements_in_view.length;

		for( var i=0 ; i<elements_in_view_length ; i++ )
		{
			var element = _this.elements_in_view[i];

			// For each effect

			var effects_length = element.effects.length;

            for( var e=0 ; e<effects_length ; e++ )
            {
                if(_this.direction == 'vertical') {
                    var effect = element.effects[e];

                    // Get effect animation boundaries

                    switch( effect.when )
                    {
                        case 'view' : // Maintained for backwards compatibility
                        case 'span' :
                            var start = element.top - _this.viewport_height;
                            var end = element.bottom;
                            break;

                        case 'exit' :
                            var start = element.bottom - _this.viewport_height;
                            var end = element.bottom;
                            break;

                        default :
                            var start = element.top - _this.viewport_height;
                            var end = element.top;
                            break;
                    }

                    // Crop boundaries

                    if( effect.crop )
                    {
                        if( start < 0 ) start = 0;
                        if( end > ( _this.body_height - _this.viewport_height ) ) end = _this.body_height - _this.viewport_height;
                    }

                    // Get scroll position of reference selector

                    var scroll = ( _this.viewport_top - start ) / ( end - start );
                } else {
                    var effect = element.effects[e];

                    // Get effect animation boundaries

                    switch( effect.when )
                    {
                        case 'view' : // Maintained for backwards compatibility
                        case 'span' :
                            var start = element.left - _this.viewport_width;
                            var end = element.right;
                            break;

                        case 'exit' :
                            var start = element.right - _this.viewport_width;
                            var end = element.right;
                            break;

                        default :
                            var start = element.left - _this.viewport_width;
                            var end = element.left;
                            break;
                    }

                    // Crop boundaries

                    if( effect.crop )
                    {
                        if( start < 0 ) start = 0;
                        if( end > ( _this.body_width - _this.viewport_width ) ) end = _this.body_width - _this.viewport_width;
                    }

                    // Get scroll position of reference selector

                    var scroll = ( _this.viewport_left - start ) / ( end - start );                }
				// Get relative scroll position for effect

				var from = effect[ 'from' ];
				var to = effect[ 'to' ];

				var length = to - from;

                if( scroll < from && forwards ) { scroll = from; }
                if( scroll > to && forwards ) { scroll = to; }

                // if( scroll > from && !forwards ) { scroll = from; }
                // if( scroll < to && !forwards ) { scroll = to; }

				var scroll_relative = ( scroll - from ) / length;

                var forwards = ( to > from ) ? true : false;

				// Apply easing

				var scroll_eased = effect.easing( scroll_relative );

				// Get new value for each property

				var opacity    = _this.animate_value( scroll , scroll_eased , from , to , effect , 'opacity' );
				var translatey = _this.animate_value( scroll , scroll_eased , from , to , effect , 'translatey' );
				var translatex = _this.animate_value( scroll , scroll_eased , from , to , effect , 'translatex' );
				var translatez = _this.animate_value( scroll , scroll_eased , from , to , effect , 'translatez' );
				var rotatex    = _this.animate_value( scroll , scroll_eased , from , to , effect , 'rotatex' );
				var rotatey    = _this.animate_value( scroll , scroll_eased , from , to , effect , 'rotatey' );
				var rotatez    = _this.animate_value( scroll , scroll_eased , from , to , effect , 'rotatez' );
				var scale      = _this.animate_value( scroll , scroll_eased , from , to , effect , 'scale' );
				var scalex     = _this.animate_value( scroll , scroll_eased , from , to , effect , 'scalex' );
				var scaley     = _this.animate_value( scroll , scroll_eased , from , to , effect , 'scaley' );
				var scalez     = _this.animate_value( scroll , scroll_eased , from , to , effect , 'scalez' );

				// Override scale values

				if( 'scale' in effect.properties )
				{
					scalex = scale;
					scaley = scale;
					scalez = scale;
				}

				// Update properties

				effect.element.css(
				{
					'opacity' : opacity,
					'transform' : 'translate3d( '+translatex+', '+translatey+', '+translatez+') rotateX( '+rotatex+') rotateY( '+rotatey+') rotateZ( '+rotatez+') scale3d( '+scalex+' , '+scaley+' , '+scalez+' )'
				} );
			}
		}
	}

	// ----------------------------------------------------------------------------------------------------
	// Calculate property values

	_this.animate_value = function( scroll , scroll_eased , from , to , effect , property )
	{
		var value_default = _this.property_defaults[ property ];

        if(property == 'opacity') {
            if('startopacity' in effect.properties)
                value_default = effect.properties.startopacity;
        }

		// Return default value if property is not animated

		if( !( property in effect.properties ) ) return value_default;

		var value_target = effect.properties[ property ];

		var forwards = ( to > from ) ? true : false;

		// Allow use of percentage values on translate properties

		var percentages = (property.indexOf('translate') >=0 && typeof value_target == 'string' && value_target.charAt(value_target.length - 1) == '%' );
		var translate_unit = 'px'; // default to pixel units

		if ( percentages ) {
			value_target = parseFloat(value_target.slice(0, -1), 10);
			translate_unit = '%';
		}

		// Return boundary value if outside effect boundaries

		if( scroll < from && forwards ) { return value_default; }
		if( scroll > to && forwards ) { return value_target; }

		if( scroll > from && !forwards ) { return value_default; }
		if( scroll < to && !forwards ) { return value_target; }

		// Calculate new property value

		var new_value = value_default + ( scroll_eased * ( value_target - value_default ) );

		// Round as required and add appropriate unit

		switch( property )
		{
			case 'opacity'    : new_value = new_value.toFixed(2); break;
			case 'translatex' : new_value = new_value.toFixed(0) + translate_unit; break;
			case 'translatey' : new_value = new_value.toFixed(0) + translate_unit; break;
			case 'translatez' : new_value = new_value.toFixed(0) + translate_unit; break;
			case 'rotatex'    : new_value = new_value.toFixed(1) + 'deg'; break;
			case 'rotatey'    : new_value = new_value.toFixed(1) + 'deg'; break;
			case 'rotatez'    : new_value = new_value.toFixed(1) + 'deg'; break;
			case 'scale'      : new_value = new_value.toFixed(3); break;
			default : break;
		}

		// Done

		return new_value;
	}

	// ----------------------------------------------------------------------------------------------------
	// Update viewport position

	_this.update_viewport_position = function()
	{
		_this.viewport_top = $window.scrollTop();
		_this.viewport_bottom = _this.viewport_top + _this.viewport_height;

        _this.viewport_left = $window.scrollLeft();
        _this.viewport_right = _this.viewport_left + _this.viewport_width;

        // console.log($window.scrollLeft());
        // console.log($document);
        // console.log(_this.viewport_right);
	}

	// ----------------------------------------------------------------------------------------------------
	// Update list of elements in view

	_this.update_elements_in_view = function()
	{
		_this.elements_in_view = [];

		var elements_length = _this.elements.length;
		for( var i=0 ; i<elements_length ; i++ )
		{
            if(_this.direction == 'vertical') {
                if ( ( _this.elements[i].top < _this.viewport_bottom ) && ( _this.elements[i].bottom > _this.viewport_top ) )
                {
                    _this.elements_in_view.push( _this.elements[i] );
                }
            } else {
                if ( _this.elements[i].left > _this.viewport_right ) {
                    //Before
                    _this.elements[i].element.removeClass("scrollme--after scrollme--active scrollme--over scrollme--complete");
                    _this.elements[i].element.addClass("scrollme--before");
                } else if(( _this.elements[i].left < _this.viewport_right ) && ( _this.elements[i].right > _this.viewport_left )) {
                    //Visible
                    _this.elements_in_view.push( _this.elements[i] );
                    _this.elements[i].element.removeClass("scrollme--before scrollme--after");
                    _this.elements[i].element.addClass("scrollme--active");

                    if(Math.floor(_this.elements[i].left) <= Math.floor(_this.viewport_left)) {
                        //Complete (left side touches)
                        if(Math.floor(_this.elements[i].right) <= Math.floor(_this.viewport_right)) {
                            //Over (right side touches)
                            _this.elements[i].element.removeClass("scrollme--complete");
                            _this.elements[i].element.addClass("scrollme--over");
                        } else {
                            _this.elements[i].element.removeClass("scrollme--over");
                            _this.elements[i].element.addClass("scrollme--complete");
                        }
                    } else {
                        //Incomplete (but active)
                        _this.elements[i].element.removeClass("scrollme--complete scrollme--over");
                    }

                } else {
                    //After
                    _this.elements[i].element.removeClass("scrollme--before scrollme--active scrollme--over scrollme--complete");
                    _this.elements[i].element.addClass("scrollme--after");
                }
                // } else {
                //     _this.elements[i].element.removeClass("scrollme--before");
                // }

                // if ( ( _this.elements[i].left < _this.viewport_right ) && ( _this.elements[i].right > _this.viewport_left ) ) {
                //     _this.elements_in_view.push( _this.elements[i] );
                //     _this.elements[i].element.addClass("scrollme--active");
                // } else {
                //     _this.elements[i].element.removeClass("scrollme--active");
                //     $(".wasfixed", _this.elements[i].element).removeClass("wasfixed");
                // }

                // if ( (Math.abs(_this.elements[i].left) <= _this.viewport_left) && !$('.scrollme--active').not(_this.elements[i].element).length ) {
                //     //After
                //     _this.elements[i].element.addClass("scrollme--complete");
                //     $(".fixme", _this.elements[i].element).removeClass("wasfixed").addClass("fixed")
                // } else {
                //     _this.elements[i].element.removeClass("scrollme--complete");
                //     $(".fixme", _this.elements[i].element).each(function() {
                //         var fixed = $(this).removeClass("fixed")
                //         if(_this.elements[i].left <= _this.viewport_left) {
                //             fixed.addClass("wasfixed");
                //         } else {
                //             fixed.removeClass("wasfixed");
                //         }
                //         // fixed.css({'left':_this.viewport_left - _this.elements[i].left});
                //     })
                // }

            }
		}
        // console.log(_this.elements_in_view);
	}

	// ----------------------------------------------------------------------------------------------------
	// Stuff to do on resize

	_this.on_resize = function()
	{
		// Update viewport/element data

		_this.update_viewport();
		_this.update_element_sizes();

		// Update display

		_this.update_viewport_position();
		_this.update_elements_in_view();
		_this.animate();
	}

	// ----------------------------------------------------------------------------------------------------
	// Update viewport parameters

	_this.update_viewport = function()
	{
		_this.body_height = $document.height();
		_this.viewport_height = $window.height();
        _this.body_width = $document.width();
        _this.viewport_width = $window.width();
	}

	// ----------------------------------------------------------------------------------------------------
	// Update height of animated elements

	_this.update_element_sizes = function()
	{
		var elements_length = _this.elements.length;

		for( var i=0 ; i<elements_length ; i++ )
		{
			var element_height = _this.elements[i].element.outerHeight();
            var element_width = _this.elements[i].element.outerWidth();
			var position = _this.elements[i].element.offset();

			_this.elements[i].height = element_height;
            _this.elements[i].width = element_width;
			_this.elements[i].top = position.top;
            _this.elements[i].left = position.left;
			_this.elements[i].bottom = position.top + element_height;
            _this.elements[i].right = position.left + element_width;
		}
	}

	// ----------------------------------------------------------------------------------------------------
	// Bind initialisation

	// $document.one( _this.init_events.join( ' ' ) , function(){ _this.init(); });

	// ----------------------------------------------------------------------------------------------------

	return _this;

	// ----------------------------------------------------------------------------------------------------

}));

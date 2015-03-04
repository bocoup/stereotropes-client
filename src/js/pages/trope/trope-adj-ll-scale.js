define(function(require) {
  var d3 = require('d3');
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var $ = require('jquery');
  var _ = require('lodash');

  /**
   * Checks to see if two rectangles overlap
   * @param  {Object} r1 Rectangle with x,y,width and height properties
   * @param  {Object} r2 Rectangle with x,y,width and height properties
   * @return {boolean} true if overlap, false otherwise.
   */
  function _overlap(r1, r2) {
    return !(r2.x > (r1.x + r1.width) ||
      (r2.x + r2.width) < r1.x ||
      r2.y > (r1.y + r1.height) ||
      (r2.y + r2.height)< r1.y);
  }

  /**
   * Builds a triangle path string
   * @private
   * @param  {Object} p1 Point with x,y coordinates
   * @param  {Object} p2 Point with x,y coordinates
   * @param  {Object} p3 Point with x,y coordinates
   * @return {string} triangle string
   */
  function _makeTriangle(currentBBox, flip) {

    var ty;
    if (currentBBox.y > height / 4) {
      // below
      ty = currentBBox.y;
    } else {
      ty = currentBBox.y + currentBBox.height;
    }

    // add variance relative to connecting point
    var triangleWidth = currentBBox.width;
    var varianceMax = triangleWidth * 0.30; // max horizontal movement
    var totalMovement = 0; //varianceMax * Math.random(); // the amount of that movement

    var startX = Math.max(currentBBox.x - totalMovement, 0);

    var p1 = { x : startX, y : ty }; // start of word
    var p2 = { x : startX + currentBBox.width, y : ty}; // end of word
    var p3 = { x : flip ? currentBBox.x + currentBBox.width : currentBBox.x, y : height/4 }; // dot on horizontal line

    return "M" + p1.x + " " + p1.y +
      " L " + p2.x + " " + p2.y +
      " L " + p3.x + " " + p3.y + " Z";
  }

  /**
   * Moves a d3 selection to the top of its parent container.
   * Useful to unhide things.
   * @return {d3.selection}
   */
  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };

  /**
   * Introduces a cached jitter for a position. Takes a
   * scale, which is the +/- range to jitter around and an
   * index to cache the result under. The results are cached so that
   * different elements in the same index can share the same jitter.
   *
   * @private
   * @param  {integer} scale The range to jitter +/- around
   * @param {integer} idx Index to cache the jitter for
   * @return {float} jitter amount
   */
  var _jitter = (function() {
    var map = []; //cache _jitters if they are called
    return function(scale, idx) {
      if (typeof map[idx] !== "undefined") {
        return map[idx];
      } else {
        var sign = Math.random() > 0.5 ? -1 : 1;
        map[idx] = Math.random() * scale * sign;
        return map[idx];
      }
    };
  }());

  // =========================
  // Setup dimensions:
  var height = 400;
  var radius = 3;
  var width;

  // Setup containers and other cached variables.
  var svg;
  var scales;
  var bases = {};

  /**
   * Returns the appropriate x for an adjective based on its
   * scale conversion, but also the screen edge. Once we added jittering
   * it was difficult to make sure it fits within the screen because the
   * jitter amount could push it off.
   * @private
   * @param  {Object} d datum
   * @param  {integer} i index of datum
   * @return {float} x position
   */
  function _getX(d, i) {
    return Math.min(
      Math.max(
        scales.x(d[3]) + _jitter(radius * 2, i),
        radius),
      width - radius);
  }

  /**
   * draws the horizontal axis, as well as the circles for each
   * one of the adjectives
   * @private
   * @param  {Object} data Data containing adjectives data
   */
  function _drawAxis(data) {

    // find line or add one
    var line = bases.axis_g.select("line");
    if (line.empty()) {
      line = bases.axis_g.append("line");
    }

    line.attr({
        x1 : 0, x2 : width,
        y1 : height/4, y2: height/4
      });

    // draw points for all the adjectives
    bases.adjective_points = bases.axis_g.selectAll('circle')
      .data(data.adjectives, function(d) { return d[0]; });

    var entering_adjective_points = bases.adjective_points.enter();
    entering_adjective_points.append('circle');

    bases.adjective_points.attr({
      cx : function(d, i) {
        return _getX(d,i);
      },
      cy: height / 4,
      r: radius
    });
  }


  /**
   * Cache for bounding boxes for text adjective elements
   * @private
   * @type {Array}
   */
  var textBoundingBoxes = [];

  /**
   * Tracking the current rendered floor
   * @private
   * @type {Number}
   */
  var currentFloor = 0;

  /**
   * Current trope id, to compute uniqueness of adjectives
   * @private
   * @type {String}
   */
  var trope_id;

  /**
   * Gets called for each adjective selection on enter to position
   * the adjectives or move them to their respective position
   * @private
   * @param  {Object} d Datum
   * @param  {integer} i Index of datum in data array
   */
  var _adjectivesOnEnter = (function () {
      var floors = 3;
      var textHeight = 25;
      var paddingFromAxis = 10;

      var floorHeights = [];
      for (var i = 0; i < floors; i++) {
        floorHeights.push(height/4 - ((i+1) * textHeight) - paddingFromAxis); //above
        floorHeights.push(height/4 + ((i+1) * textHeight) + 10 + paddingFromAxis); //below
      }

      return function(d, i) {
        // get initial position of text box
        var y = floorHeights[currentFloor];
        var x = _getX(d,i);

        var selection = d3.select(this);
        selection.attr({ x : x, y : y }).text(d[0]);

        // check intersection and move the text box around if needbe
        var overlapping = true;
        var count = textBoundingBoxes.length, counter=0;
        var currentBBox = selection[0][0].getBBox();

        // if the end of the text is outside the frame, we need to move it OR
        // If a potential flip will keep the adjective inside the frame, give a 50%
        // chance to a flip.
        var flip = false;
        if (currentBBox.x + currentBBox.width > width ||
          (x - currentBBox.width > 0 && Math.random() > 0.5)) {
          selection.attr("x", x - currentBBox.width);
          currentBBox = selection[0][0].getBBox();
          flip = true;
        }

        // loop while we're overlapping and we haven't traversed all the
        // available cached Bounding Boxes.
        while(overlapping && counter < count) {

          // if we're overlapping, try a new floor.
          if (_overlap(textBoundingBoxes[counter], currentBBox)) {
            currentFloor += 1;

            // if we can't fit it, we're just not going to render it...
            if (currentFloor + 1 > (floors * 2)) {
              selection.classed("hidden", true);
              currentFloor = 0;
              break;

            // try the next floor, restart comparison counter against all
            // bounding boxes we have
            } else {
              y = floorHeights[currentFloor];
              selection.attr("y", y);
              currentBBox = selection[0][0].getBBox();
              counter = 0; // start comparing from the beginning again
            }

          // no overlap! Great. position it, exit the loop.
          } else if (counter + 1 >= count) {
            overlapping = false;
            currentFloor = 0;

          // there's an overlap, and we just moved the box, and we're going
          // to try again.
          } else {
            counter++;
          }
        } // end while

        currentBBox = selection[0][0].getBBox();
        textBoundingBoxes.push(selection[0][0].getBBox());

        //===== add a triangle ======
        // if we are above the line, then it should be from the bottom
        // of the box, otherwise, it should be from the top.

        var pathString = _makeTriangle(currentBBox, flip);
        var triangle = bases.adjective_triangles.selectAll("path")
          .data([d], function(d) { return d[0]; });

        if (triangle.empty()) {
          triangle.enter()
            .insert("path", ":first-child")
            .classed("triangle", true);
        }

        triangle.attr("d", pathString)
          .style('opacity', 0)
          .transition()
          .delay(Math.random() * 400)
            .style('opacity', 0.15);

        // add a uniqueness marker if this adjective doesn't appear in other tropes
        if (d[4].length === 1 && d[4][0] === trope_id) {
          triangle.classed("unique", true);
        }

      };
    }());

  /**
   * Cleares cached variables after placing adjectives so that future updates
   * can recompute positions with empty arrays.
   * @private
   * @return {[type]}
   */
  var _onEndAdjectivePlacement = function() {
    textBoundingBoxes = [];
    currentFloor = 0;
  };

  function processData(data) {
    // only get adjectives that have positive ll scores
    var adjs = _.filter(data.adjectives, function(d) {
      return d[2] > 0;
    });

    data.adjectives = adjs;
  }

  function draw(el, data) {

    processData(data);

    var container = d3.select(el);
    width = $(el).width();

    // mark the element with its gender
    if (data.gender === 'm') {
      container.classed('gender-m', true);
    } else {
      container.classed('gender-f', true);
    }

    trope_id = data.id;

    svg = container.append('svg')
      .attr({ width: width, height: height });

    scales = {
      x : d3.scale.linear()
        .range([radius, width-radius])
        .domain(
          d3.extent(data.adjectives, function(d) { return d[3]; }).reverse())
    };

    // === base containers
    // axis base
    bases.axis_g = svg.append("g")
      .attr("class", "axis");

    // triangle container
    bases.adjective_triangles = svg.append("g")
      .attr("class", "triangles");

    // text label container
    bases.adjectives_text = svg.append("g")
      .attr("class", "adjectives");

    // ====== axis: =====
    _drawAxis(data);

    // ======= adjectives: ========
    var adjective_text = bases.adjectives_text.selectAll('text')
      .data(data.adjectives, function(d) { return d[0]; });

    var entering_adjective_text = adjective_text.enter().append('text');
    entering_adjective_text.each(_adjectivesOnEnter);
    _onEndAdjectivePlacement();

    // === events:
    entering_adjective_text.on('mouseover', function(d) {

      // mark current label as selected
      d3.select(this)
        .classed('selected', true);

      // find corresponding triangle, mark it as selected
      bases.adjective_triangles.selectAll('path')
        .data([d], function(d) { return d[0]; })
        .classed('selected', true);

      // find corresponding circle, mark it as selected
      bases.axis_g.selectAll('circle')
         .data([d], function(d) { return d[0]; })
        .classed('selected', true)
        .moveToFront();
    });

    entering_adjective_text.on('mouseout', function(d) {
      // deselect current label
      d3.select(this)
        .classed('selected', false);

      // find corresponding triangle, deselect it
      bases.adjective_triangles.selectAll('path')
        .data([d], function(d) { return d[0]; })
        .classed('selected', false);

      // find corresponding circle, deselect it
      bases.axis_g.selectAll('circle')
         .data([d], function(d) { return d[0]; })
        .classed('selected', false);

    });
  }

  /**
   * Updates the timeline.
   * @param  {Object} options Should set new width
   * @return {[type]}
   */
  function update(options, data) {
    if (options.width) {
      width = options.width;

      // update svg:
      svg.attr({ width: width });
      scales.x.range([radius, width-radius]);

      // update axis:
      _drawAxis(data);

      // update adjectives & triangles.
      bases.adjectives_text.selectAll('text').data(data.adjectives,
        function(d) {
          return d[0];
        }).each(_adjectivesOnEnter);
      _onEndAdjectivePlacement();
    }
  }

  var template = require("tmpl!../../pages/trope/trope-adj-ll-scale");

  return View.extend({
    template: template,
    initialize: function(options) {
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }

      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;
    },

    /**
     * Updates the adjective visualization. options should specify new width.
     * @param  {Object} options Options containing new width.
     */
    update: function(options) {
      if (this.trope_data) {
        update(options, this.trope_data);
      }
    },

    _preDataRender: function() {
      this.$el.html(this.template(this.trope_data));
      return this;
    },
    _render: function() {
      var self = this;
      this._preDataRender();

      return dataManager.getTropeDetails(this.trope_id).then(function(trope_details) {
        self.trope_data = trope_details;
        self.trope_data.loading = false;
        self.$el.html(self.template(self.trope_data));
        draw(self.$el.find(".vis")[0], trope_details);
        return self;
      });
    }
  });
});
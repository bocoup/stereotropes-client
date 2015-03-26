define(function(require) {


  /**
   * The main visualization for the trope page, rendering triangles
   * along an x axis using their log likelyhood score.
   *
   * It also renders tropes that share some of these adjectives.
   *
   * When selecting an adjective, the user sees all the tropes that share it.
   *
   * When selecting a trope, the user sees all the adjective used in it that
   * are common to the trope on the page.
   */

  var d3 = require('d3');
  require('../../shared/d3.moveToFront');
  require('../../shared/d3.endall');

  var View = require('../../core/view');
  var Backbone = require('backbone');
  var dataManager = require('../../data/data_manager');
  var $ = require('jquery');
  var _ = require('lodash');
  var Promise = require('bluebird');

  /**
   * Trope dictionary, mapping tropeId -> trope metadata.
   * @private
   * @type {Object}
   */
  var tropeDictMap = {};

  /**
   * Event bus for view/chart coordination for events that need to
   * pass outside this scope.
   * @private
   * @type {d3.dispatch}
   */
  var dispatch = d3.dispatch("tropeSelected");

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
   * @param  {Object} currentBBox Current bounding box
   * @param {boolean} flip Boolean to indicate whether the triangle is below or above.
   * @return {string} triangle path string
   */
  function _makeTriangle(currentBBox, flip) {

    var ty;
    if (currentBBox.y > height / 4) {
      // below
      ty = currentBBox.y;
    } else {
      ty = currentBBox.y + currentBBox.height;
    }

    var startX = currentBBox.x;

    var p1 = { x : startX, y : ty }; // start of word
    var p2 = { x : startX + currentBBox.width, y : ty}; // end of word
    var p3 = { x : flip ? currentBBox.x + currentBBox.width : currentBBox.x, y : height/4 }; // dot on horizontal line

    return "M" + p1.x + " " + p1.y +
      " L " + p2.x + " " + p2.y +
      " L " + p3.x + " " + p3.y + " Z";
  }

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
  var current_trope_id;

  /**
   * Gets called for each adjective selection on enter to position
   * the adjectives or move them to their respective position
   * @private
   * @param  {Object} d Datum
   * @param  {integer} i Index of datum in data array
   */
  var _adjectivesOnEnter = (function () {
      var floors = 3;
      var textHeight = 22;
      var paddingFromAxis = 5;

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
            .style('opacity', 0.25);

        // add a uniqueness marker if this adjective doesn't appear in other tropes
        if (d[4].length === 1 && d[4][0] === current_trope_id) {
          triangle.classed("unique", true);
        }

      };
    }());

  /**
   * Cleares cached variables after placing adjectives so that future updates
   * can recompute positions with empty arrays.
   * @private
   */
  var _onEndAdjectivePlacement = function() {
    textBoundingBoxes = [];
    currentFloor = 0;
  };

  /**
   * Gets a subset of tropes to be rendered below the adjective log
   * likelyhood line
   * @private
   * @param  {Array} data        data
   * @param  {number} totalTropes Total number of tropes to retrieve
   * @return {Promise}
   */
  function _getTropeSubset(data, totalTropes) {
    var tropeMap = {};

    // build trope map
    for (var i = 0; i < data.adjectives.length; i++) {
      for (var t = 0; t < data.adjectives[i][4].length; t++) {
        var adj = data.adjectives[i][0];
        var tropeId = data.adjectives[i][4][t];
        if (tropeId !== current_trope_id) {
          if (tropeMap[tropeId]) {
            tropeMap[tropeId].adjs.push(adj); // save adjective as related
            tropeMap[tropeId].count++;
          } else {
            tropeMap[tropeId] = { tropeId: tropeId, adjs : [adj], count: 1 };
          }
        }
      }
    }

    // get trope values and get top N by count
    var tl = _.values(tropeMap);
    tl = _.sortBy(tropeMap, function(d) { return -d.count; });
    var subset = tl.slice(0, totalTropes);

    // get all the trope dictionary data
    return new Promise(function(resolve, reject) {
       dataManager.getTropes(_.pluck(subset, "tropeId")).then(function(dict) {
        _.each(dict, function(trope) {
          tropeDictMap[trope.id] = trope;
        });
        resolve(subset);
      });
     });
  }

  /**
   * Draws the trope list on the bottom of the adjectives line
   * @private
   * @param  {Object} data
   */
  function _drawTropes(data) {
    var columnWidth = 200; // min column width
    var columns = Math.floor(width / columnWidth); // how many can we fit?
    columnWidth = width / columns; // actual column width

    // gather trope list
    var textElHeight = 25;
    var tropesPerList = Math.floor(((height / 2) - 20) / textElHeight);
    var totalTropes = columns * tropesPerList;

    // get a subset of the tropes we're going to display
    _getTropeSubset(data, totalTropes).then(function(subset) {

      var tropeSelection = bases.tropes.selectAll('g')
        .data(subset, function(d) { return d.tropeId; });

      // make new nodes if we need them
      tropeSelection.enter().append('g');

      // position new and existing nodes:
      var currentColumn = 0, inColumn = 0;
      tropeSelection.each(function(d, i) {

        var rect = d3.select(this).select('rect');
        if (rect.empty()) {
          rect = d3.select(this).append('rect');
        }

        var textNodes = d3.select(this).select('text');
        if (textNodes.empty()) {
          textNodes = d3.select(this).append('text');
        }

        // == compute X position based on the column we are in:
        if (inColumn >= tropesPerList) {
          inColumn = 0;
          currentColumn++;
        }
        inColumn++;
        var textX = currentColumn * columnWidth;

        // == compute Y position based on the index of the item %
        // the total items we expect
        var textY = textElHeight * (i % (tropesPerList));

        textNodes.attr({
          x : textX + (currentColumn === 0 ? 4 : 0),
          y : textY
        }).text(function() {
          return tropeDictMap[d.tropeId].name;
        })
        .style("width", columnWidth)
        .classed("trope-name", true);

        // possibly shorten the text once its been placed.
        var bbox = textNodes[0][0].getBBox();
        if (bbox.width > columnWidth) {

          var name = tropeDictMap[d.tropeId].name;
          var charsWidth = bbox.width / name.length;

          var newlencount = (bbox.width / charsWidth) - (2*charsWidth);
          var newname = name.substring(0, newlencount) + '...';

          textNodes.text(newname);
        }

        // position the rect now that we hve the bounding box
        var boxPadding = 2;
        rect.attr("class", "gender-" + tropeDictMap[d.tropeId].gender)
          .attr({
            x : textX - boxPadding,
            y : textY + boxPadding - bbox.height,
            width: bbox.width + (boxPadding*2) + 4,
            height : bbox.height + (boxPadding*2)
          });
      });

      // mark the groups selected or deselected on mouse over
      tropeSelection.on('mouseover', function(d) {
        var selection = d3.select(this);
        var selectionBBox = selection[0][0].getBBox();

        // adjust selectionBBox to transform...
        selectionBBox.y += height/2 + 30;

        selection.classed('selected', true);

        // deselect all adjectives
        bases.adjectives_text.selectAll('text')
          .classed("deselected", true);

        // find the appropriate triangles and highlight them
        var adjectives = bases.adjectives_text.selectAll('text')
          .filter(function(dd) {
            return d.adjs.indexOf(dd[0]) > -1;
          });

        adjectives
          .classed("selected", true) // selected
          .classed("deselected", false); // and not deselected...

        // find triangles
        var triangles = bases.adjective_triangles.selectAll('path')
          .filter(function(dd) {
            return d.adjs.indexOf(dd[0]) > -1;
          });

        triangles.classed("selected", true);

        triangles.each(function(dd) {
          var triangle = d3.select(this);
          var triangleBBox = triangle[0][0].getBBox();

          // is this above or below the fold?
          var above = true;
          if (triangleBBox.y >= height / 4) {
            above = false;
          }

          // make the connector beam...
          var topY = (above ? triangleBBox.y : (triangleBBox.y + triangleBBox.height + 18)); // text height

          var points = [
            { x : triangleBBox.x + triangleBBox.width, y: topY }, // top right
            { x : triangleBBox.x, y : topY }, // top left
            { x : selectionBBox.x, y : selectionBBox.y }, // bottom left
            { x : selectionBBox.x + selectionBBox.width, y : selectionBBox.y } // bottom right
          ];
          var pathString = _makePath(points);

          bases.connector_beams.append("path")
            .attr("d", pathString)
            .classed("gender-" + tropeDictMap[d.tropeId].gender, true);
        });

      });

      tropeSelection.on('click', function(d) {
        dispatch.tropeSelected(d.tropeId);
      });

      tropeSelection.on('mouseout', function(d) {
        var selection = d3.select(this);
        selection.classed('selected', false);

        // remove connector beams
        bases.connector_beams.selectAll('path').remove();

        // find all adjectives and remove the deselect label
        // from all of them.
        bases.adjectives_text.selectAll('text')
          .classed("deselected", false);

        // find the appropriate triangles and highlight them
        var adjectives = bases.adjectives_text.selectAll('text')
          .filter(function(dd) {
            return d.adjs.indexOf(dd[0]) > -1;
          });

        adjectives.classed("selected", false);

        var triangles = bases.adjective_triangles.selectAll('path')
          .filter(function(dd) {
            return d.adjs.indexOf(dd[0]) > -1;
          });

        triangles.classed("selected", false);

      });

      // on exit remove the nodes...
      tropeSelection.exit().remove();
    });
  }

  /**
   * Makes a path out of points that have x & y coordinates.
   * @private
   * @param  {[Object]} points Point array
   * @return {String}       Resulting path
   */
  function _makePath(points) {
    var path = "M ";
    for(var i = 0; i < points.length; i++) {
      path += points[i].x + " " + points[i].y;
      if (i + 1 < points.length) {
        path += " L ";
      }
    }
    return path + " Z";
  }

  /**
   * Removes adjectives that have a negative log liklihood score
   * @private
   * @param  {[Object]} data data
   * @return {[Object]}      data with filtered adjective list.
   */
  function _processData(data) {
    // only get adjectives that have positive ll scores
    var adjs = _.filter(data.adjectives, function(d) {
      return d[2] > 0;
    });

    data.adjectives = adjs;
  }


  /**
   * Main draw routune
   * @param  {Object} el   DOM node
   * @param  {[Object]} data Trope data to render
   */
  function draw(el, data) {

    _processData(data);

    var container = d3.select(el);
    width = $(el).width();

    // mark the element with its gender
    if (data.gender === 'm') {
      container.classed('gender-m', true);
    } else {
      container.classed('gender-f', true);
    }

    current_trope_id = data.id;

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

    // beams
    bases.connector_beams = svg.append("g")
      .attr("class", "beams");

    // triangle container
    bases.adjective_triangles = svg.append("g")
      .attr("class", "triangles");

    // text label container
    bases.adjectives_text = svg.append("g")
      .attr("class", "adjectives");

    // trope section label
    bases.axis_g.append("text")
      .classed("label", true)
      .text("tropes that share these adjectives")
      .attr({
        x : 0, y : height / 2
      });

    // trope container
    bases.tropes = svg.append("g")
      .attr("class", "tropes")
      .attr("transform", "translate(0," + ((height / 2) + 30) + ")");

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

      // deselect all adjectives
      bases.adjectives_text.selectAll('text')
        .classed('deselected', true);

      // mark current label as selected
      d3.select(this)
        .classed('selected', true)
        .classed('deselected', false);

      // find corresponding triangle, mark it as selected
      var triangle = bases.adjective_triangles.selectAll('path')
        .data([d], function(d) { return d[0]; })
        .classed('selected', true);

      // find corresponding circle, mark it as selected
      bases.axis_g.selectAll('circle')
         .data([d], function(d) { return d[0]; })
        .classed('selected', true)
        .moveToFront();

      // find corresponding tropes
      // console.log(d);
      var tropes = bases.tropes.selectAll('g').filter(function(dd) {
        return d[4].indexOf(dd.tropeId) > -1;
      });

      var triangleBBox = triangle.node().getBBox();

      // is this above or below the fold?
      var above = true;
      if (triangleBBox.y >= height / 4) {
        above = false;
      }

      // make the connector beam...
      var topY = (above ? triangleBBox.y : (triangleBBox.y + triangleBBox.height + 18)); // text height

      tropes.each(function(dd) {

        // mark as selected
        var selection = d3.select(this);
        var selectionBBox = selection.node().getBBox();

        selection.classed('selected', true);

        var points = [
          { x : triangleBBox.x + triangleBBox.width, y: topY }, // top right
          { x : triangleBBox.x, y : topY }, // top left
          { x : selectionBBox.x, y : selectionBBox.y + height / 2 + 30 }, // bottom left
          { x : selectionBBox.x + selectionBBox.width, y : selectionBBox.y + height / 2 + 30} // bottom right
        ];
        var pathString = _makePath(points);

        bases.connector_beams.append("path")
            .attr("d", pathString)
            .classed("gender-" + tropeDictMap[dd.tropeId].gender, true);
      });

    });

    entering_adjective_text.on('mouseout', function(d) {
      // remove deselect label from all labels
      bases.adjectives_text.selectAll('text')
        .classed('deselected', false);

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

      // find corresponding tropes
      // console.log(d);
      var tropes = bases.tropes.selectAll('g').filter(function(dd) {
        return d[4].indexOf(dd.tropeId) > -1;
      });

      // remove all markings from tropes.
      tropes.each(function(dd) {
        // mark as selected
        var selection = d3.select(this);
        selection.classed('selected', false);
      });

      // remove all beams.
      bases.connector_beams.selectAll("path").remove();

    });

    // ======= tropes =======
    _drawTropes(data);
  }

  /**
   * Updates the log likelihood adjective chart.
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

      // update trope list
      _drawTropes(data);
    }
  }

  /**
   * Used to fade out a selection at a fixed step, remove the elements when
   * fade out and then call a resolve callback at the end of the transition.
   * @private
   * @param  {d3.selection} selection Selection
   * @param  {Function} delayFn   Delay computing function
   * @param  {Function} resolve   Callback resolve function
   * @return {d3.selection}           Transition selection
   */
  function _fadeOut(selection, delayFn, resolve) {
    return selection.transition()
      .delay(delayFn)
      .style('opacity', 0)
      .remove()
      .endall(resolve);
  }

  /**
   * Removes the visualization elements.
   * @private
   * @return {Promise} Returns a promise
   */
  function remove() {
    var delay = 5;
    var delayFn = function(d, i) { return i * delay; };
    // remove triangles
    var removeTriangles = new Promise(function(resolve, reject) {
      _fadeOut(bases.adjective_triangles.selectAll("path"), delayFn, resolve);
    });

    var removeAdjectives = new Promise(function(resolve, reject) {
      _fadeOut(bases.adjectives_text.selectAll("text"), delayFn, resolve);
    });

    var removeCircles = new Promise(function(resolve, reject) {
      bases.axis_g.selectAll('circle')
        .transition()
        .delay(delayFn)
        .attr("r", 0)
        .remove()
        .endall(resolve);
    });

    var removeTropes = new Promise(function(resolve, reject) {
      _fadeOut( bases.tropes.selectAll('g'), delayFn, resolve);
    });

    var removeBeams = new Promise(function(resolve,reject) {
      _fadeOut(bases.connector_beams.selectAll("path"), delayFn, resolve);
    });

    // we aren't making a promise for this just because there is only
    // one line...
    bases.axis_g.selectAll("line,text")
      .transition()
      .delay(delayFn)
      .style('opacity', 0)
      .remove();

    return Promise.settle(removeTriangles,
      removeAdjectives, removeCircles, removeTropes, removeBeams);
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

    _remove : Promise.method(function() {
      var self = this;
      if (this.trope_data) {
        return remove().then(function() {
          return new Promise(function(resolve) {
            self.$el.fadeOut(200, resolve);
          });
        });
      }
    }),

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

        dispatch.on('tropeSelected', function(id) {
          Backbone.history.navigate('/tropes/' + id, { trigger: true });
        });

        return self;
      });
    }
  });
});
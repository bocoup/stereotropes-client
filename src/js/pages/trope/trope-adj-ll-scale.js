define(function(require) {
  var d3 = require('d3');
  var View = require('../../core/view');
  var dataManager = require('../../data/data_manager');
  var $ = require('jquery');

  require('d3Chart');

  function overlap(r1, r2) {
    return !(r2.x > (r1.x + r1.width) ||
      (r2.x + r2.width) < r1.x ||
      r2.y > (r1.y + r1.height) ||
      (r2.y + r2.height)< r1.y);
  }

  function makeTriangle(p1, p2, p3) {
    return "M" + p1.x + " " + p1.y +
      " L " + p2.x + " " + p2.y +
      " L " + p3.x + " " + p3.y + " Z";
  }

  function processData(data) {

    var extent = d3.extent(data.adjectives, function(d) { return d[3]; });
    return {
      extent: extent
    };
  }

  function draw(el, data) {

    var dataMetrics = processData(data);
    var container = d3.select(el);
    var width = $(el).width();
    var height = 600;
    var radius = 3;

    // mark the element with its gender
    if (data.gender === 'm') {
      container.classed('gender-m', true);
    } else {
      container.classed('gender-f', true);
    }

    var svg = container.append('svg')
      .attr({
        width: width,
        height: height
      });


    var scales = {
      x : d3.scale.linear().range([radius, width-radius]).domain(dataMetrics.extent.reverse())
    };

    // draw horizontal line
    var axis_g = svg.append("g")
      .attr("class", "axis");

    axis_g.append("line")
      .attr({
        x1 : 0, x2 : width,
        y1 : height/4, y2: height/4
      });

    // draw points for all the adjectives
    var adjective_points = axis_g.selectAll('circle')
      .data(data.adjectives, function(d) { return d[0]; });

    var entering_adjective_points = adjective_points.enter();
    entering_adjective_points.append('circle').attr({
      cx : function(d) {
        return scales.x(d[3]);
      },
      cy: height / 4,
      r: radius
    });

    // draw adjective labels
    var floors = 3;
    var currentFloor = 0;
    var textBoundingBoxes = [];
    var textHeight = 20;

    var floorHeights = [];
    for (var i = 0; i < floors; i++) {
      floorHeights.push(height/4 - ((i+1) * textHeight)); //above
      floorHeights.push(height/4 + ((i+1) * textHeight) + 10); //below
    }

    var adj_g = svg.append("g")
      .attr("class", "adjectives");

    var adjective_text = adj_g.selectAll('text')
      .data(data.adjectives, function(d) { return d[0]; });

    var entering_adjective_text = adjective_text.enter().append('g');
    entering_adjective_text.each(function(d) {

      // get initial position of text box
      var y = floorHeights[currentFloor];
      var x = scales.x(d[3]);

      var selection = d3.select(this).append('text');
      selection.attr({ x : x, y : y}).text(d[0]);

      // check intersection and move the text box around if needbe
      var overlapping = true;
      var count = textBoundingBoxes.length, counter=0;
      var currentBBox = selection[0][0].getBBox();

      // if the end of the text is outside the frame, we need to move it.
      var flip = false;
      if (currentBBox.x + currentBBox.width > width) {
        selection.attr("x", x - currentBBox.width);
        currentBBox = selection[0][0].getBBox();
        flip = true;
      }

      while(overlapping && counter < count) {

        if (overlap(textBoundingBoxes[counter], currentBBox)) {

          currentFloor += 1;

          if (currentFloor + 1 > floors * 2) {
            // if we can't fit it, we're just not going to render it...
            selection.classed("hidden", true);
            currentFloor = 0;
            break;
          } else {
            // try the next floor, restart comparison counter against all
            // bounding boxes we have
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
      }

      currentBBox = selection[0][0].getBBox();
      textBoundingBoxes.push(selection[0][0].getBBox());

      //===== add a triangle ======
      // if we are above the line, then it should be from the bottom
      // of the box, otherwise, it should be from the top.
      var ty;
      if (currentBBox.y > height / 4) {
        // below
        ty = currentBBox.y;
      } else {
        ty = currentBBox.y + currentBBox.height;
      }

      var pathString = makeTriangle(
        { x : currentBBox.x, y : ty}, // start of word
        { x : currentBBox.x + currentBBox.width, y : ty}, // end of word
        { x : flip ? currentBBox.x + currentBBox.width : currentBBox.x, y : height/4 } // dot on horizontal line
      );

      d3.select(this).insert("path", ":first-child")
        .classed("triangle", true)
        .attr("d", pathString);

    });


  }

  return View.extend({
    initialize: function(options) {
      if (!options.trope_id) {
        throw new Error("Trope id required for rendering trope tile!");
      }

      this.trope_data = {
        loading : true
      };

      this.trope_id = options.trope_id;
    },
     _preDataRender: function() {
      // this.$el.html(this.template(this.trope_data));
      return this;
    },
    _render: function() {
      var self = this;
      this._preDataRender();

      return dataManager.getTropeDetails(this.trope_id).then(function(trope_details) {
        self.trope_data = trope_details;
        self.trope_data.loading = false;
        draw(self.$el[0], trope_details);
        return self;
      });
    }
  });
});
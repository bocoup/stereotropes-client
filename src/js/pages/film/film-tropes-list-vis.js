define(function(require) {

  var d3 = require("d3");

  /**
   * tropeList - render the list vis for
   * showing tropes associated with a movie
   *
   * @return {chart}
   */
  var tropeList = function() {
    // default height/width - will
    // get passed in or calculated
    var height;
    var width;
    
    // send trope selected event up
    var dispatch = d3.dispatch("tropeSelected");

    // minimum size the 
    // visualization can be
    // TODO: figure out best min height
    var minHeight = 240;
    // space alloted for words 
    // in trope lists
    // TODO: should I just use a scale?
    var textHeight = 20;
    // padding around 
    // hightlight boxes
    var boxPadding = 4;

    // Similar to margins - but work inside the SVG
    var padding = {top:20, left:10, bottom:20, right:10};

    var textWrap = d3.svg.textWrap();

    // Spacing for columns.
    // Initialized later
    var positions = {f : 0, middle : 0, m : 0};

    // processed data
    var data = [];
    var svg = null;
    // main group to render in
    var g = null;

    /**
     * chart - 'initialization' function
     *
     * @param selection - one or more d3 selections
     * to render into. Selection has raw data bound
     * to it already.
     * @return {undefined}
     */
    var chart = function(selection) {
      selection.each(function(rawData) {
        data = processData(rawData);
        setHeight(data);
        updatePositions();

        svg = d3.select(this).selectAll("svg").data([data]);
        svg.enter().append("svg").append("g");

        svg.attr("width", width);
        svg.attr("height", height);

        // padding doesn't add to svg size, but does move
        // outer group over
        g = svg.select("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        update();
      });
    };

    /**
     * update - setup data bindings
     * and update visual
     *
     * @return {undefined}
     */
    function update() {
      // outer group element used to bind f / m data arrays
      var genders = g.selectAll(".gender").data(data);
      genders.enter().append("g")
        .attr("class", function(d) { return "gender gender-" + d.key; });

      var tropes = genders.selectAll(".trope-name").data(function(d) { return d.value; } );

      // http://www.w3.org/TR/SVGTiny12/svgudom.html#svg__SVGLocatable
      // dont use transformation if you want to cross groups 
      // and use getBBox()
      var tropesE = tropes.enter();
      tropesE.append("text")
        .attr("class", "trope-name");

      tropes.attr("x", function(d,i) {
          // positions are based on parent key values
          // I could also use the trope's gender directly
          // but I don't like that as much
          return positions[d3.select(this.parentNode).datum().key];
        })
        .attr("y", function(d,i) { 
          // shiftDown is used for the case of the smaller list
          // of tropes so that it is centered with respect to the
          // larger list
          var shiftDown = (height - (textHeight * this.parentNode.__data__.value.length)) / 2;
          return shiftDown + (i * textHeight);
        })
        .text(function(d) { return d.details.name; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click", click);
    }

    /**
     * mouseover
     *
     * @param d - current data element
     * @param i - current index
     * @return {undefined}
     */
    function mouseover(d,i) {

      // TODO: better way to get gender?
      var gender = d.details.gender;

      var text = d3.select(this);
      text.classed('highlight', true);

      // this bbox is relative to its
      // parent group and doesn't 
      // honor transformations - so
      // we don't use transformations!
      var bbox = text.node().getBBox();
     
      // add box under words. This 
      // inserts a new rect instead of
      // having all the rects already
      // rendered. Not sure which is 
      // slower.
      d3.select(text.node().parentNode)
        .insert("rect", ".trope-name")
        .attr("x", bbox.x - boxPadding)
        .attr("y", bbox.y)
        .attr("width", bbox.width + boxPadding * 2)
        .attr("height", bbox.height)
        .attr("class", "underbox gender-" + gender);

      // panel is the middle portion where 
      var panel = g.selectAll('.middle-panel').data([d]);
      var panelE = panel.enter().append("g")
        .attr("class", "middle-panel");

      panelE.append("rect")
        .attr("class", "background");
      panelE.append("text");

      // TODO: better way to position?
      // TODO: break out in separate function?
      // we start with a standard offset to shift the
      var textOffset = (gender === 'f') ? -200 : 200;

      // textX is the start of the text box
      var textX = positions.middle - (textWrap.bounds().width / 2);

      // we don't want to go above the vis.
      // shift up/down box based on offset and location
      var textY = Math.max(0, (textHeight * i) + textOffset);

      // don't go past the height of the vis
      textY = Math.min(textY, height);

      // reset textWrap x and y
      textWrap.bounds({width: width / 3, height: height, x:textX, y:textY}).padding(6);
      // here we call textWrap which will convert our string to a set of tspan's
      panel.select("text")
        .attr("text-anchor", "start")
        .text(d.roles.join("\n"))
        .call(textWrap);
  
      var panelBBox = panel.select("text").node().getBBox();
      // it is possible that after text wrapping, the bottom edge
      // (plus padding) goes past the bottom of the vis.
      var overDiff = height - (panelBBox.y + panelBBox.height +(boxPadding * 9) );
      if(overDiff < 0) {
        // if so, move the tspans up.
        panel.select('text').selectAll("tspan")
          .attr("y", function(d,i) { 
              return Math.max(0, (+d3.select(this).attr("y") + overDiff)); 
          });
        // and reset the panelBBox - for the background
        panelBBox = panel.select("text").node().getBBox();
      } 

      // put background under the text
      panel.select(".background")
        .classed("gender-" + gender, true)
        .attr("x", panelBBox.x - boxPadding * 2)
        .attr("y", panelBBox.y - boxPadding)
        .attr("width", panelBBox.width + boxPadding * 4)
        .attr("height", panelBBox.height + boxPadding * 2);

     
      // add beam
      var beamPath = getBeamPath(g.select(".underbox").node().getBBox(),
                        panel.select(".background").node().getBBox());
      g.append("path")
        .attr("class", "beam gender-" + gender)
        .attr("d", beamPath);
    }

    /**
     * getBeamPath - calculte path 
     *
     * @param startBbox - starting bounding box
     * @param endBbox - ending bounding box
     * @return {undefined}
     */
    function getBeamPath(startBbox, endBbox) {
      // a really verbose way to do it, I'm sure could be improved
      var p1 = {x: startBbox.x, y: startBbox.y};
      var p2 = {x: p1.x, y: startBbox.y + startBbox.height};
      var p3 = {x: endBbox.x + endBbox.width, y: endBbox.y + endBbox.height};
      var p4 = {x: p3.x, y: endBbox.y};
      if (startBbox.x < endBbox.x) {
        p1.x = startBbox.x + startBbox.width;
        p2.x = p1.x;
        p3.x = endBbox.x;
        p4.x = p3.x;
      }
      var path = "M" + p1.x + " " + p1.y;
      path += " L" + p2.x + " " + p2.y;
      path += " L" + p3.x + " " + p3.y;
      path += " L" + p4.x + " " + p4.y;
      path += " Z";

      return path;
    }

    /**
     * mouseout - handle mouse out
     *
     * @param d - data of element we are mouseouting
     * @param i - index
     * @return {undefined}
     */
    function mouseout(d,i) {
      d3.select(this).classed('highlight', false);
      // maybe just make it disappear?
      d3.select(this.parentNode).select(".underbox").remove();
      g.selectAll('.middle-panel').remove();
      g.select(".beam").remove();
    }

    /**
     * click - send off trope selected event
     *
     * @param d - current trope selected 
     * @return {undefined}
     */
    function click(d) {
      dispatch.tropeSelected(d.id);
    }

    /**
     * updatePositions - calculate positions of 
     * columns based on current width
     *
     * @return {undefined}
     */
    function updatePositions() {
      positions = {
        f : width / 4,
        middle : (width / 2),
        m : (width / 2) + (width / 4)
      };

      // set this initially
      textWrap.bounds({width: width / 3, height: height, x:0,y:0}).padding(6);
    }

    /**
     * setHeight - determine height of visualization
     * based on number of rows to present
     *
     * @param data
     * @return {undefined}
     */
    function setHeight(data) {
      var maxCount = d3.max(data, function(d) { return d.value.length; });
      var columnHeight = (maxCount * textHeight) + (padding.top + padding.bottom);
      height = Math.max(columnHeight, minHeight);
    }

    /**
     * processData - convert dict to 
     * array of arrays to make it
     * ready for d3 binding.
     *
     * @param rawData
     * @return {undefined}
     */
    function processData(rawData) {
      var data = [];
      // ensure both groups are present
      data = d3.entries(rawData);
      // ensure female is always first
      data.sort(function(a,b) {
        return (a.key === "f") ? -1 : 1;
      });
      return data;
    }

    /**
     * width - public function to
     * modify width. 
     * WARNING: currently doesn't 
     * call a resize. You must call
     * resize manually.
     *
     * @param w
     * @return {undefined}
     */
    chart.width = function(w) {
      if (!arguments.length) {
        return width;
      }
      width = w;
      return this;
    };

    /**
     * resize - updates positions
     * and resizes visualization
     *
     * @return {undefined}
     */
    chart.resize = function() {
      updatePositions();
      svg.attr("width", width)
        .attr("height", height);
      update();
      return this;
    };

    // get `on` from dispatch onto our chart
    d3.rebind(chart, dispatch, "on");

    return chart;
  };

  return tropeList;

});

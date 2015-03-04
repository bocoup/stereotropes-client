define(function(require) {
  var Promise = require('bluebird');
  var d3 = require("d3");
  require("../../shared/d3.text");
  var View = require("../../core/view");
  var dataManager = require('../../data/data_manager');

  /**
   * tropeList - 
   *
   * @return {chart}
   */
  var tropeList = function() {
    // default height/width - will
    // get passed in or auto calculated
    var height = 600;
    var width = 600;  

    // minimum size the 
    // visualization can be
    var minHeight = 240;
    // space alloted for words 
    // in trope lists
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
    var data = [];
    var g = null;

    /**
     * chart
     *
     * @param selection
     * @return {undefined}
     */
    var chart = function(selection) {
      selection.each(function(rawData) {
        console.log(rawData);
        data = processData(rawData);
        console.log(data);
        setHeight(data);
        updatePositions();

        var svg = d3.select(this).selectAll("svg").data([data]);
        svg.enter().append("svg").append("g");

        svg.attr("width", width);
        svg.attr("height", height);

        g = svg.select("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        update();
      });
    };

    function update() {
      var genders = g.selectAll(".gender").data(data);
      genders.enter().append("g")
        .attr("class", function(d) { return "gender gender-" + d.key; });

      var tropes = genders.selectAll(".trope").data(function(d) { return d.value; } );

      // http://www.w3.org/TR/SVGTiny12/svgudom.html#svg__SVGLocatable
      // dont use transformation if you want to cross groups 
      // and use getBBox()
      var tropesE = tropes.enter();
      tropesE.append("text")
        .attr("class", "trope-name")
        .attr("x", function(d,i) {
          // positions are based on parent key values
          // I could also use the trope's gender directly
          // but I don't like that as much
          return positions[this.parentNode.__data__.key];
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
        .on("mouseout", mouseout);
    }

    function mouseover(d,i) {
      var gender = d.details.gender;
      var text = d3.select(this);
      text.classed('highlight', true);

      var bbox = text.node().getBBox();
     
      // add box under words
      // TODO: move out magic numbers
      d3.select(text.node().parentNode)
        .insert("rect", ".trope-name")
        .attr("x", bbox.x - boxPadding)
        .attr("y", bbox.y)
        .attr("width", bbox.width + boxPadding * 2)
        .attr("height", bbox.height)
        .attr("class", "underbox gender-" + gender);

      var panel = g.selectAll('.middle-panel').data([d]);
      var panelE = panel.enter().append("g")
        .attr("class", "middle-panel");

      panelE.append("rect")
        .attr("class", "background");
      panelE.append("text");

      // recalculate to get textX location
      var textX = positions.middle - (textWrap.bounds().width / 2);
      var textOffset = (gender === 'f') ? -200 : 200;
      var textY = Math.max(0, (textHeight * i) + textOffset);
      textY = Math.min(textY, height);
      textWrap.bounds({width: width / 3, height: height, x:textX, y:textY}).padding(6);
      panel.select("text")
        .attr("text-anchor", "start")
        .text(d.roles.join("\n"))
        .call(textWrap);
  
      var panelBBox = panel.select("text").node().getBBox();
      // TODO: move out magic numbers
      panel.select(".background")
        .classed("gender-" + gender, true)
        .attr("x", panelBBox.x - boxPadding * 2)
        .attr("y", panelBBox.y - boxPadding)
        .attr("width", panelBBox.width + boxPadding * 4)
        .attr("height", panelBBox.height + boxPadding * 2);

      var beamPath = getBeamPath(g.select(".underbox").node().getBBox(),
                        panel.select(".background").node().getBBox());
      g.append("path")
        .attr("class", "beam gender-" + gender)
        .attr("d", beamPath);
      
    }

    function getBeamPath(startRect, endRect) {
      var p1 = {x: startRect.x, y: startRect.y};
      var p2 = {x: p1.x, y: startRect.y + startRect.height};
      var p3 = {x: endRect.x + endRect.width, y: endRect.y + endRect.height};
      var p4 = {x: p3.x, y: endRect.y};
      if (startRect.x < endRect.x) {
        p1.x = startRect.x + startRect.width;
        p2.x = p1.x;
        p3.x = endRect.x;
        p4.x = p3.x;
      }
      var path = "M" + p1.x + " " + p1.y;
      path += " L" + p2.x + " " + p2.y;
      path += " L" + p3.x + " " + p3.y;
      path += " L" + p4.x + " " + p4.y;
      path += " Z";

      return path;
    }

    function mouseout(d,i) {
      d3.select(this).classed('highlight', false);
      // maybe just make it disappear?
      d3.select(this.parentNode).select(".underbox").remove();
      g.selectAll('.middle-panel').remove();
      g.select(".beam").remove();
    }

    function updatePositions() {
      positions = {
        f : width / 4,
        middle : (width / 2),
        m : (width / 2) + (width / 4)
      };

      textWrap.bounds({width: width / 3, height: height, x:0,y:0}).padding(6);
    }

    function setHeight(data) {
      var maxCount = d3.max(data, function(d) { return d.value.length; });
      var columnHeight = (maxCount * textHeight) + (padding.top + padding.bottom);
      height = Math.max(columnHeight, minHeight);
    }

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

    chart.height = function(h) {
      if (!arguments.length) {
        return height;
      }
      height = h;
      return this;
    };

    chart.width = function(w) {
      if (!arguments.length) {
        return width;
      }
      width = w;
      return this;
    };

    return chart;
  };

  var plotData = function(selector, data, plot) {
    return selector
      .datum(data)
      .call(plot);
  };

  var template = require("tmpl!../../pages/film/film-tropes-list");
  /**
   * Defines a view that wraps the above visualization
   * @param  {Options} options Requires: height, width, film_id
   * @return {Backbone.View}
   */
  return View.extend({
    template: template,
    initialize: function(options) {
      this.film_id = options.film_id;
      this.options = options;
    },
    _preDataRender: function() {
      this.$el.html(this.template());
      return this;
    },
    collapseRoles: function(rawRoles) {
      console.log(rawRoles);
      var roles = {'f':[],'m':[]};
      d3.keys(rawRoles).forEach(function(g) {
        var tropeNest = d3.nest()
          .key(function(d) { return d.id; })
          .entries(rawRoles[g]);
        tropeNest.forEach(function(d) {
          var trope = {"id":d.key, roles:[]};
          d.values.forEach(function(v) {
            trope.roles.push(v.role);
          });
          roles[g].push(trope);
        });

      });
      return roles;
    },
    getRoleDetails: function(roles) {
      var details = [];
      // get details for all roles in the film
      d3.keys(roles).forEach(function(g) {
        roles[g].forEach(function(trope) {
          details.push(dataManager.getTropeDetails(trope.id));
        });
      });
      return details;
    },
    addRoleDetails: function(roles, roleDetails) {
      var roleMap = d3.map(roleDetails, function(d) { return d.id; });
      d3.keys(roles).forEach(function(g) {
        roles[g].forEach(function(trope) {
          trope.details = roleMap.get(trope.id);
        });
      });
      return roles;
    },
    _render: function() {
      var self = this;
      self._preDataRender();
      var list = tropeList();
      list.width(self.options.width);

      return dataManager.getFilmDetails(this.film_id).then(function(film_details) {

        var roles = self.collapseRoles(film_details.roles);
        var roleDetailPromises = self.getRoleDetails(roles);
        return Promise.all(roleDetailPromises).then(function(roleDetails) {
          self.addRoleDetails(roles, roleDetails);

          self.$el.html(self.template(film_details));
          self.chart = d3.select(self.$el.find('.vis')[0]);
          plotData(self.chart, roles, list);
          return self;
        });

      });
    }
  });
});

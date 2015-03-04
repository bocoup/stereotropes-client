define(function(require) {
  var Promise = require('bluebird');
  var d3 = require("d3");
  require("./d3.text");
  require("./get_metrics");
  var View = require("../../core/view");
  var dataManager = require('../../data/data_manager');

  var margin = {top:20, left:10, bottom:20, right:10};
  var positions = {};

  var textWrap = d3.svg.textWrap();

  var tropeList = function() {
    var height = 600;
    var width = 600;
    var minHeight = 240;
    var textHeight = 30;
    var data = [];
    var g = null;

    // var yScale = d3.scale.ordinal();
    var xScale = d3.scale.ordinal();

    var chart = function(selection) {
      selection.each(function(rawData) {
        data = processData(rawData);
        setupScales(data);

        var svg = d3.select(this).selectAll("svg").data([data]);
        svg.enter().append("svg").append("g");

        console.log(data);

        svg.attr("width", width);
        svg.attr("height", height);

        g = svg.select("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        update();
      });
    };

    function update() {
      var genders = g.selectAll(".gender").data(data);
      genders.enter().append("g")
        .attr("class", function(d) { return "gender gender-" + d.key; });

      // well, do dumb stuff with parent data because transforms arent taken into account
      // for getBBox()
      var tropes = genders.selectAll(".trope").data(function(d) { return d.value; } );
      var tropesE = tropes.enter();
      tropesE.append("text")
        .attr("class", "trope-name")
        // .attr("transform", function(d,i) { 
        //   return "translate(" + 0 + "," + i * textHeight+ ")";
        // })
        .attr("x", function(d,i) {
          return positions[this.parentNode.__data__.key];
        })
        .attr("y", function(d,i) { 
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
        .attr("x", bbox.x - 4)
        .attr("y", bbox.y)
        .attr("width", bbox.width + 8)
        .attr("height", bbox.height)
        .attr("class", "underbox gender-" + gender);

      var textX = positions.middle - (textWrap.bounds().width / 2);
      var panel = g.selectAll('.middle-panel').data([d]);
      var panelE = panel.enter().append("g")
        .attr("class", "middle-panel");
        // .attr("transform", "translate(" + textX + "," + 0 + ")");

      panelE.append("rect")
        .attr("class", "background");
      panelE.append("text");

      textWrap.bounds({width: width / 3, height: height, x:textX, y:0}).padding(6);
      panel.select("text")
        .attr("text-anchor", "start")
        .text(d.role)
        .call(textWrap);
  
      var panelBBox = panel.select("text").node().getBBox();
      // TODO: move out magic numbers
      panel.select(".background")
        .classed("gender-" + gender, true)
        .attr("x", panelBBox.x - 8)
        .attr("y", panelBBox.y - 4)
        .attr("width", panelBBox.width + 16)
        .attr("height", panelBBox.height + 8);

      var beamPath = getBeamPath(g.select(".underbox").node().getBBox(),
                        panel.select(".background").node().getBBox());

      g.append("path")
        .attr("class", "beam gender-" + gender)
        .attr("d", beamPath);
      
    }

    function getBeamPath(startRect, endRect) {
      console.log(startRect);
      console.log(endRect);
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

    function setupScales(data) {
      xScale.domain([0,0.5,1])
        .rangeRoundPoints([0, width], 2);

      positions = {
        f : width / 4,
        middle : (width / 2),
        m : (width / 2) + (width / 4)
      };
      var maxLength = d3.max(data, function(d) { return d.value.length; });
      height = Math.max(((maxLength * textHeight) + (margin.top + margin.bottom)), minHeight);
      textWrap.bounds({width: width / 3, height: height, x:0,y:0}).padding(6);

    }

    function processData(rawData) {
      var data = [];
      if(rawData.roles) {
        rawData.roles.f = rawData.roles.f || [];
        rawData.roles.m = rawData.roles.m || [];
        data = d3.entries(rawData.roles);
        // ensure female is always first
        data.sort(function(a,b) {
          return (a.key === "f") ? -1 : 1;
        });
      }

      return data;
    }

    chart.height = function(h) {
      if (!arguments.length) {
        return height;
      }
      height = h; //- (margin.top + margin.bottom);
      return this;
    };

    chart.width = function(w) {
      if (!arguments.length) {
        return width;
      }
      width = w; // - (margin.left + margin.right);
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
      list.width(self.options.width)
        .height(self.options.height);
      return dataManager.getFilmDetails(this.film_id).then(function(film_details) {

        var roleDetails = self.getRoleDetails(film_details.roles);

        return Promise.all(roleDetails).then(function(roleDetails) {
          self.addRoleDetails(film_details.roles, roleDetails);

          self.$el.html(self.template(film_details));
          self.chart = d3.select(self.$el.find('.vis')[0]);
          plotData(self.chart, film_details, list);
          return self;
        });

      });
    }
  });
});

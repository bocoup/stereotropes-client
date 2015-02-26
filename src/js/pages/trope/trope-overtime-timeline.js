define(function(require) {

  var d3 = require("d3");
  require("d3Chart");
  var _ = require("lodash");
  var View = require("../../core/view");
  var dataManager = require('../../data/data_manager');

  var defaultTicks = ["Films of the 1920s",
        "Films of the 1950s",
        "Films of the 1980s",
        "Films of the 2010s"];

  /**
   * Defines a tropes over time visualization
   * @param  {Object} options Requires options: height, width. Optional: y_margin.
   * @return {d3.selection}
   */
  d3.chart("TropeOvertime", {
    initialize: function(options) {
      var self = this;
      this.height = options.height;
      this.width = options.width;
      this.y_margin = options.y_margin || 20;
      this.marker_r = 3;

      this.scales = {
        x : d3.scale.ordinal().rangeBands([-1, this.width-20]),
        y : d3.scale.linear().range([this.height - this.y_margin - this.marker_r*2, 0])
      };

      this.area = d3.svg.area()
        .x(function(d) {
          return self.scales.x(d[0]) + self.scales.x.rangeBand()/2;
        })
        .y0(this.height - this.y_margin)
        .y1(function(d) {
          return this.scales.y(d[2]);
        })
        .interpolate("cardinal");

      this.xAxis = d3.svg.axis()
        .tickFormat(function(d) {
          return d.substring(12,17);
        })
        .tickSize(-this.height)
        .orient("bottom");

      this.bases = {
        area : this.base.append("g"),
        xAxis : this.base.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (this.height-this.y_margin) + ")"),
        line : this.base.append("g").attr("class", "marker"),
        maxline : this.base.append("g").attr("class", "max_line")
      };

      // create an area chart
      this.layer("area", this.bases.area, {
        dataBind: function(data) {
          return this.selectAll("path")
            .data([data]);
        },
        insert: function() {
          return this.append("path")
            .attr("class", "area");
        },
        events: {
          enter: function() {
            var chart = this.chart();
            this.attr("d", function(d) {
              return chart.area(d);
            });
          }
        }
      });

      // create a marker layer for the line to the max
      this.layer("max", this.bases.line, {
        dataBind: function(data) {
          // find max
          var max = d3.max(data, function(d) {
            return d[2];
          });
          var maxPoint = _.filter(data, function(d) {
            if (d[2] === max) { return true; }
          });
          return this.selectAll('line')
            .data(maxPoint);
        },

        insert: function() {
          return this.append("line");
        },
        events: {
          enter: function() {
            var chart = this.chart();
            this.attr({
              x1 : function(d) {
                return chart.scales.x(d[0]) + chart.scales.x.rangeBand()/2;
              },
              x2 : function(d) {
                return chart.scales.x(d[0]) + chart.scales.x.rangeBand()/2;
              },
              y1 : function(d) {
                return chart.scales.y(d[2]);
              },
              y2 : function(d) {
                return chart.height - chart.y_margin;
              }
            });
          }
        }
      });

      // create a marker layer for the line to the max
      this.layer("max_line", this.bases.maxline, {
        dataBind: function(data) {
          // find max
          var max = d3.max(data, function(d) {
            return d[2];
          });
          var maxPoint = _.filter(data, function(d) {
            if (d[2] === max) { return true; }
          });
          return this.selectAll('text')
            .data(maxPoint);
        },

        insert: function() {
          return this.append("text");
        },
        events: {
          enter: function() {
            var chart = this.chart();
            this.attr({

              x : function(d) {
                return chart.width - 4;
              },
              y : function(d) {
                return chart.scales.y(d[2]) + 9;
              }
            }).text(function(d) {
              return d3.format(".1%")(d[2]);
            });
          }
        }
      });
    },

    /**
     * Adjust scales, render axis.
     * @param  {Array} data
     * @return {Array} data
     */
    transform: function(data) {
      var times =  _.map(data, function(d) { return d[0]; });
      var values = _.map(data, function(d) { return d[2]; });

      var valuesExtent = d3.extent(values);
      //valuesExtent[1]+= 0.005;

      this.scales.x.domain(times);
      this.scales.y.domain(valuesExtent).nice();

      this.xAxis.scale(this.scales.x);
      this.xAxis.tickValues(defaultTicks);

      this.bases.xAxis.call(this.xAxis);

      return data;
    }

  });

  var template = require('tmpl!../trope/trope-overtime-timeline');

  /**
   * Defines a view that wraps the above visualization
   * @param  {Options} options Requires: height, width, trope_id
   * @return {Backbone.View}
   */
  return View.extend({
    template: template,

    initialize: function(options) {
      this.trope_id = options.trope_id;
      this.options = options;
    },

    _render: function() {
      var self = this;
      return dataManager.getTropeDetails(this.trope_id).then(function(trope_details) {

        // set gender class on container
        self.$el.html(self.template(trope_details));
        self.$el.addClass('gender-' + trope_details.gender);

        // create new timeline chart
        self.chart = d3.select(self.$el.find('.vis')[0])
        .append("svg")
          .attr("height", self.options.height)
          .attr("width", self.options.width)
        .chart("TropeOvertime", self.options);

        self.chart.draw(trope_details.occurrence_over_time);

        return self;
      });
    }
  });

});
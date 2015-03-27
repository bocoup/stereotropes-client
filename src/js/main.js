define(function(require, exports, module) {
  'use strict';

  var Backbone = require('backbone');
  var $ = require('jquery');
  var Router = require('./core/router');
  var openLinkInTab = false;

  new Router();

  Backbone.history.start({
    pushState: true,
    root: "/"
  });

  $(document).keydown(function(event) {
    if (event.ctrlKey || event.keyCode === 91) {
      openLinkInTab = true;
    }
  });

  $(document).keyup(function(event) {
    openLinkInTab = false;
  });

  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router. If the link has a `data-bypass`
  // attribute, bypass the delegation completely.
  $(document).on("click", "a[href^='#']:not([data-bypass])", function(evt) {

    // Prevent the default event (including page refresh).
    evt.preventDefault();

    var href = $(this).attr("href");
    if (!openLinkInTab) {

      // `Backbone.history.navigate` is sufficient for all Routers and will
      // trigger the correct events. The Router's internal `navigate` method
      // calls this anyways. The fragment is sliced from the root.
      Backbone.history.navigate(href, true);
    } else {
      if (href.indexOf('#') === 0) {
        href = href.slice(1); // remove # from the url
        window.open("/" + href, "_blank"); // open new blank target window
      }
    }
  });
});

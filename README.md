mpld3_rewrite
=============

**Note: this has been merged into the main mpld3 repository. Any further
development will happen there.**

A work in progress to refactor [mpld3](http://github.com/jakevdp/mpld3) in
conjunction with [mplexporter](http://github.com/mpld3/mplexporter).

The basic design idea is to write mpld3 so that the plot data and style
information is stored in a standard JSON object, and then have a stand-alone
javascript library which can use this JSON information to construct a plot.
The conversion from matplotlib to this JSON format will be done via
[mplexporter](http://github.com/mpld3/mplexporter).

This is very similar to the approach taken by vega, but at a bit lower level.
Because vega's objects are very high level, it becomes difficult to closely
duplicate the look of a matplotlib plot with the browser using vega.


Installation
============
This package is based on the [mplexporter](http://github.com/mpld3/mplexporter)
framework for crawling and exporting matplotlib images. This is bundled with
the source distribution via git submodule.

To download this dependency and bundle it into the mpld3 package, run

    [~]$ make build

To install the package via setup.py, type 

    [~]$ make install


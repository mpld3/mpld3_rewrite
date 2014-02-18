mpld3_rewrite
=============

A work in progress to refactor mpld3 in conjunction with mplexporter.

The basic idea is to write mpld3 so that the plot data and style information is
stored in a standard JSON object, and then have a stand-alone javascript library
which can use this JSON information to construct a plot. The conversion from
matplotlib to this JSON format will be done via
[mplexporter](http://github.com/mpld3/mplexporter).

This is very similar to the approach taken by vega, but at a bit lower level.
Because vega's objects are very high level, it becomes difficult to exactly
duplicate the look of a matplotlib plot within a d3 browser viewer.

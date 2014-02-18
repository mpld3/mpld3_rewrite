import random
import json
import jinja2

import numpy as np

# mplexporter can be found at http://github.com/mpld3/mplexporter
from mplexporter.exporter import Exporter
from mplexporter.renderers import Renderer


class MPLD3Renderer(Renderer):
    def __init__(self):
        self.figure_json = None
        self.axes_json = None
        self.finished_figures = []

    def add_data(self, data):
        if not self.figure_json:
            raise ValueError("Cannon add data when no figure is open")
        datalabel = "data{0:2d}".format(len(self.figure_json['data']) + 1)
        self.figure_json['data'][datalabel] = data
        return datalabel

    def open_figure(self, fig, props):
        self.figure_json = dict(width=props['figwidth'] * props['dpi'],
                             height=props['figheight'] * props['dpi'],
                             axes=[],
                             data={})

    def close_figure(self, fig):
        if not hasattr(self, "finished_figs"):
            self.finished_figs = []
        self.finished_figs.append((fig, self.figure_json))

    def open_axes(self, ax, props):
        self.axes_json = dict(bbox=props['bounds'],
                              xlim=props['xlim'],
                              ylim=props['ylim'],
                              xgridOn=props['xgrid'],
                              ygridOn=props['ygrid'],
                              lines=[],
                              markers=[],
                              texts=[])
        self.figure_json['axes'].append(self.axes_json)

    def close_axes(self, ax):
        self.axes_json = None

    def draw_line(self, data, coordinates, style):
        line = dict(data=self.add_data(np.asarray(data).tolist()))
        for key in ['color', 'linewidth', 'dasharray', 'alpha']:
            line[key] = style[key]
        self.axes_json['lines'].append(line)

    def draw_markers(self, data, coordinates, style):
        markers = dict(data=self.add_data(np.asarray(data).tolist()))
        for key in ['facecolor', 'edgecolor', 'edgewidth', 'alpha']:
            markers[key] = style[key]
        self.axes_json['markers'].append(markers)


MPLD3_TEMPLATE = jinja2.Template("""
<script type="text/javascript" src="{{ d3_loc }}"></script>
<script type="text/javascript" src="{{ mpld3_loc }}"></script>

<div id="fig{{ figid }}"></div>
<script type="text/javascript">
  var spec{{ figid }} = {{ figure_json }};
  var fig{{ figid }} = mpld3.draw_figure("fig{{ figid }}", spec{{ figid }});
</script>
""")

def fig_to_d3(fig, mpld3_loc="js/mpld3.v1.js",
              d3_loc="http://d3js.org/d3.v3.min.js",):
    figid = str(int(random.random() * 1E11))
    renderer = MPLD3Renderer()
    Exporter(renderer).run(fig)
    figure_json = json.dumps(renderer.finished_figs[0][1])
    return MPLD3_TEMPLATE.render(figid=figid,
                                 d3_loc=d3_loc,
                                 mpld3_loc=mpld3_loc,
                                 figure_json=figure_json)

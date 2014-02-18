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
        # Check if any column of the data exists elsewhere
        # If so, we'll use that dataset rather than duplicating it.
        data = np.asarray(data)
        if data.ndim != 2 and data.shape[1] != 2:
            raise ValueError("Data is expected to be of size [N, 2]")

        # here we check whether any previously-added dataset
        # is a potential match
        matching_data = -1
        for i, d in enumerate(self.datasets):
            if data.shape[0] != d.shape[0]:
                continue

            matches = np.array([np.all(col == d.T, axis=1)
                                for col in data.T])
            if np.any(matches):
                matching_data = i
                break

        if matching_data >= 0:
            new_data = list(self.datasets[matching_data].T)
            indices = []
            for i in range(data.shape[1]):
                match = np.where(matches[i])[0]
                if len(match):
                    indices.append(match[0])
                else:
                    new_data.append(data[:, i])
                    indices.append(len(new_data) - 1)

            self.datasets[matching_data] = np.asarray(new_data).T
            datalabel = self.datalabels[matching_data]
            xindex, yindex = map(int, indices)
        else:
            self.datasets.append(data)
            datalabel = "data{0:02d}".format(len(self.figure_json['data']) + 1)
            xindex = 0
            yindex = 1

        self.datalabels.append(datalabel)
        return {"data":datalabel, "xindex":xindex, "yindex":yindex}

    def open_figure(self, fig, props):
        self.datasets = []
        self.datalabels = []
        self.figure_json = dict(width=props['figwidth'] * props['dpi'],
                             height=props['figheight'] * props['dpi'],
                             axes=[],
                             data={})

    def close_figure(self, fig):
        for datalabel, dataset in zip(self.datalabels, self.datasets):
            self.figure_json['data'][datalabel] = np.asarray(dataset).tolist()
        self.finished_figures.append((fig, self.figure_json))

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
        line = self.add_data(data)
        for key in ['color', 'linewidth', 'dasharray', 'alpha']:
            line[key] = style[key]
        self.axes_json['lines'].append(line)

    def draw_markers(self, data, coordinates, style):
        markers = self.add_data(data)
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
    figure_json = json.dumps(renderer.finished_figures[0][1])
    return MPLD3_TEMPLATE.render(figid=figid,
                                 d3_loc=d3_loc,
                                 mpld3_loc=mpld3_loc,
                                 figure_json=figure_json)

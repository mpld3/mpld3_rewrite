import random
import json
import jinja2

import numpy as np

# mplexporter can be found at http://github.com/mpld3/mplexporter
from mplexporter import utils
from mplexporter.exporter import Exporter
from mplexporter.renderers import Renderer


class MPLD3Renderer(Renderer):
    def __init__(self):
        self.figure_json = None
        self.axes_json = None
        self.finished_figures = []

    @staticmethod
    def datalabel(i):
        return "data{0:02d}".format(i)

    def add_data(self, data):
        """Add a dataset to the current figure

        If the dataset matches any already added data, we use that instead.

        Parameters
        ----------
        data : array_like
            a shape [N,2] array of data

        Returns
        -------
        datadict : dictionary
            datadict has the keys "data", "xindex", "yindex", which will
            be passed to the mpld3 JSON object.
        """
        # Check if any column of the data exists elsewhere
        # If so, we'll use that dataset rather than duplicating it.
        data = np.asarray(data)
        if data.ndim != 2 and data.shape[1] != 2:
            raise ValueError("Data is expected to be of size [N, 2]")

        for (i, d) in enumerate(self.datasets):
            if data.shape[0] != d.shape[0]:
                continue

            matches = np.array([np.all(col == d.T, axis=1) for col in data.T])
            if not np.any(matches):
                continue
            
            # If we get here, we've found a dataset with a matching column
            # we'll update this data with additional columns if necessary
            new_data = list(self.datasets[i].T)
            indices = []
            for j in range(data.shape[1]):
                whr = np.where(matches[j])[0]
                if len(whr):
                    indices.append(whr[0])
                else:
                    # append a new column to the data
                    new_data.append(data[:, j])
                    indices.append(len(new_data) - 1)

            self.datasets[i] = np.asarray(new_data).T
            datalabel = self.datalabel(i + 1)
            xindex, yindex = map(int, indices)
            break
        else:
            # else here can be thought of as "if no break"
            # if we get here, then there were no matching datasets
            self.datasets.append(data)
            datalabel = self.datalabel(len(self.datasets))
            xindex = 0
            yindex = 1

        print data.shape, [d.shape for d in self.datasets], datalabel
            
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
        for i, dataset in enumerate(self.datasets):
            datalabel = self.datalabel(i + 1)
            self.figure_json['data'][datalabel] = np.asarray(dataset).tolist()
        self.finished_figures.append((fig, self.figure_json))

    def open_axes(self, ax, props):
        self.axes_json = dict(bbox=props['bounds'],
                              xlim=props['xlim'],
                              ylim=props['ylim'],
                              xgridOn=props['xgrid'],
                              ygridOn=props['ygrid'],
                              lines=[],
                              paths=[],
                              markers=[],
                              texts=[])
        self.figure_json['axes'].append(self.axes_json)

        labels = []
        if props.get('xlabel'):
            labels.append(ax.xaxis.label)
        if props.get('ylabel'):
            labels.append(ax.yaxis.label)

        for text in labels:
            content = text.get_text()
            if content:
                transform = text.get_transform()
                position = text.get_position()
                code, position = Exporter._process_transform(transform, ax,
                                                             position)
                style = utils.get_text_style(text)
                self.draw_text(content, position, code, style)


    def close_axes(self, ax):
        self.axes_json = None

    def draw_line(self, data, coordinates, style):
        line = self.add_data(data)
        line['coordinates'] = coordinates
        for key in ['color', 'linewidth', 'dasharray', 'alpha']:
            line[key] = style[key]
        self.axes_json['lines'].append(line)

    def draw_path(self, data, coordinates, pathcodes, style):
        path = self.add_data(data)
        path['coordinates'] = coordinates
        path['pathcodes'] = pathcodes
        for key in ['dasharray', 'alpha', 'facecolor',
                    'edgecolor', 'edgewidth']:
            path[key] = style[key]
        self.axes_json['paths'].append(path)

    def draw_markers(self, data, coordinates, style):
        markers = self.add_data(data)
        markers["coordinates"] = coordinates
        for key in ['facecolor', 'edgecolor', 'edgewidth',
                    'alpha']:
            markers[key] = style[key]
        if style.get('markerpath'):
            vertices, codes = style['markerpath']
            markers['markerpath'] = (vertices.tolist(), codes)
        self.axes_json['markers'].append(markers)

    def draw_text(self, text, position, coordinates, style):
        text = dict(text=text,
                    position=tuple(position),
                    coordinates=coordinates,
                    h_anchor=TEXT_HA_DICT[style['halign']],
                    v_baseline=TEXT_VA_DICT[style['valign']],
                    rotation=-style['rotation'],
                    fontsize=style['fontsize'],
                    color=style['color'],
                    alpha=style['alpha'])
        self.axes_json['texts'].append(text)
        

TEXT_VA_DICT = {'bottom': 'auto',
                'baseline': 'auto',
                'center': 'central',
                'top': 'hanging'}
TEXT_HA_DICT = {'left': 'start',
                'center': 'middle',
                'right': 'end'}


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

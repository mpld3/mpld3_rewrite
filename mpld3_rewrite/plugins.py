"""
Plugins to add behavior to mpld3 charts
=======================================

Plugins are means of adding additional javascript features to D3-rendered
matplotlib plots.  A number of plugins are defined here; it is also possible
to create nearly any imaginable behavior by defining your own custom plugin.
"""

__all__ = ['connect', 'PluginBase', 'PointLabelTooltip', 'PointHTMLTooltip',
           'LineLabelTooltip', 'ResetButton']

import json
import uuid
import matplotlib

from .utils import get_id


def connect(fig, *plugins):
    """Connect one or more plugins to a figure

    Parameters
    ----------
    fig : matplotlib Figure instance
        The figure to which the plugins will be connected

    *plugins :
        Additional arguments should be plugins which will be connected
        to the figure.

    Examples
    --------
    >>> import matplotlib.pyplot as plt
    >>> from mpld3 import plugins
    >>> fig, ax = plt.subplots()
    >>> lines = ax.plot(range(10), '-k')
    >>> plugins.connect(fig, plugins.LineLabelTooltip(lines[0]))
    """
    if not hasattr(fig, 'plugins'):
        fig.plugins = []
    for plugin in plugins:
        fig.plugins.append(plugin)


class PluginBase(object):
    def get_dict(self):
        if hasattr(self, "dict_"):
            return self.dict_
        else:
            raise NotImplementedError()

    def html(self):
        raise NotImplementedError()


class PointLabelTooltip(PluginBase):
    """A Plugin to enable a tooltip: text which hovers over points.

    Parameters
    ----------
    points : matplotlib Collection or Line2D object
        The figure element to apply the tooltip to
    labels : array or None
        If supplied, specify the labels for each point in points.  If not
        supplied, the (x, y) values will be used.
    hoffset, voffset : integer
        The number of pixels to offset the tooltip text.  Default is
        hoffset = 0, voffset = 10

    Examples
    --------
    >>> import matplotlib.pyplot as plt
    >>> from mpld3 import fig_to_d3, plugins
    >>> fig, ax = plt.subplots()
    >>> points = ax.plot(range(10), 'o')
    >>> plugins.connect(fig, PointLabelTooltip(points[0]))
    >>> fig_to_d3(fig)
    """
    def __init__(self, points, labels=None,
                 hoffset=0, voffset=10, location="mouse"):
        if location not in ["bottom left", "top left", "bottom right",
                            "top right", "mouse"]:
            raise ValueError("invalid location: {0}".format(location))
        if isinstance(points, matplotlib.lines.Line2D):
            suffix = "pts"
        else:
            suffix = None
        self.dict_ = {"type": "tooltip",
                      "id": get_id(points, suffix),
                      "labels": labels,
                      "hoffset": hoffset,
                      "voffset": voffset,
                      "location": location}


class LineLabelTooltip(PluginBase):
    """A Plugin to enable a tooltip: text which hovers over a line.

    Parameters
    ----------
    line : matplotlib Line2D object
        The figure element to apply the tooltip to
    label : string
        If supplied, specify the labels for each point in points.  If not
        supplied, the (x, y) values will be used.
    hoffset, voffset : integer
        The number of pixels to offset the tooltip text.  Default is
        hoffset = 0, voffset = 10

    Examples
    --------
    >>> import matplotlib.pyplot as plt
    >>> from mpld3 import fig_to_d3, plugins
    >>> fig, ax = plt.subplots()
    >>> points = ax.plot(range(10), 'o')
    >>> plugins.connect(fig, PointLabelTooltip(points[0]))
    >>> fig_to_d3(fig)
    """
    def __init__(self, points, label=None,
                 hoffset=0, voffset=10, location="mouse"):
        if location not in ["bottom left", "top left", "bottom right",
                            "top right", "mouse"]:
            raise ValueError("invalid location: {0}".format(location))
        self.dict_ = {"type": "tooltip",
                      "id": get_id(points),
                      "labels": label if label is None else [label],
                      "hoffset": hoffset,
                      "voffset": voffset,
                      "location": location}

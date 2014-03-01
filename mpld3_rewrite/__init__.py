"""
Interactive D3 rendering of matplotlib images
=============================================

Functions: General Use
----------------------
- :func:`fig_to_d3` : convert a figure to an html string

- :func:`show_d3` : save a figure to HTML, and open in a web browser window


Functions: IPython Notebook
---------------------------
- :func:`display_d3` : display a figure in an IPython notebook

- :func:`enable_notebook` : enable automatic D3 display of figures
                            in the IPython notebook.

- :func:`disable_notebook` : disable automatic D3 display of figures
                             in the IPython
"""

__version__ = '0.1'
__all__ = ["fig_to_d3", "display_d3", "show_d3",
           "enable_notebook", "disable_notebook",
           "D3_URL", "MPLD3_URL"]

from .urls import D3_URL, MPLD3_URL, D3_LOCAL, MPLD3_LOCAL
from .display import fig_to_d3, display_d3, show_d3
from .display import enable_notebook, disable_notebook

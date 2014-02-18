import numpy as np
import matplotlib.pyplot as plt
from mpld3renderer import fig_to_d3

x = np.linspace(0, 10, 50)

fig, ax = plt.subplots()
ax.plot(x, np.sin(x), '-ob', alpha=0.5)
ax.plot(x, np.cos(x), '-or', alpha=0.5)
ax.grid(True)
open('renderer_test.html', 'w').write(fig_to_d3(fig))

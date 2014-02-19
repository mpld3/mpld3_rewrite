import numpy as np
import matplotlib.pyplot as plt
from mpld3renderer import fig_to_d3

x = np.linspace(0, 10, 50)

fig, ax = plt.subplots()
ax.plot(x, np.sin(x), '-ob', alpha=0.5)
ax.plot(x, np.cos(x), '-or', alpha=0.5)
ax.grid(True)

filename = "renderer_test.html"
print("writing to {0}".format(filename))
open(filename, 'w').write(fig_to_d3(fig))


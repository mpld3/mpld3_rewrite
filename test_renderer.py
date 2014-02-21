import numpy as np
import matplotlib.pyplot as plt
from mpld3renderer import fig_to_d3

x = np.linspace(0, 10, 50)

fig, ax = plt.subplots()
ax.plot(x, np.sin(x), '-ob', alpha=0.5)
ax.plot(x, np.cos(x), '-^r', alpha=0.5)
ax.text(5, 0, "blue moving", fontsize=18, color="blue")
ax.text(0.5, 0.4, "red stationary", fontsize=18, color="red",
        transform=ax.transAxes)
ax.grid(True)
ax.set_xlabel('x label')
ax.set_ylabel('y label')

ax.add_patch(plt.Circle((3, 0), 0.5, ec='k', fc='g', alpha=0.2))

filename = "renderer_test.html"
print("writing to {0}".format(filename))
open(filename, 'w').write(fig_to_d3(fig, d3_loc='js/d3.v3.min.js'))


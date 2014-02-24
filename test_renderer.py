import numpy as np
import matplotlib.pyplot as plt
from mpld3renderer import fig_to_d3


def test1(filename):
    x = np.linspace(0, 10, 50)

    fig, ax = plt.subplots()
    ax.grid(True)

    ax.plot(x, np.sin(x), '-ob', alpha=0.5)
    ax.plot([0.3, 0.5, 0.7], [0.5, 0.8, 0.5], '-ok', lw=2,
            transform=ax.transAxes)
    ax.plot(x, np.cos(x), '-^r', alpha=0.5)
    ax.text(5, 0, "blue moving", fontsize=18, color="blue")
    ax.text(0.5, 0.4, "red stationary", fontsize=18, color="red",
            transform=ax.transAxes)
    ax.set_xlabel('x label')
    ax.set_ylabel('y label')

    ax.add_patch(plt.Circle((5, 0), 0.3, ec='k', fc='g', alpha=0.2))
    ax.add_patch(plt.Circle((0.3, 0.3), 0.1, ec='k', fc='y',
                            transform=ax.transAxes,
                            alpha=0.2))

    print("writing to {0}".format(filename))
    open(filename, 'w').write(fig_to_d3(fig, d3_loc='js/d3.v3.min.js'))


def test2(filename):
    np.random.seed(0)
    x, y = np.random.normal(0, 1, (2, 100))
    fig, ax = plt.subplots()
    ax.grid(True)
    ax.scatter(x, y, c=np.random.random(x.shape),
               s=100 + 300 * np.random.random(100),
               alpha=0.3)

    print("writing to {0}".format(filename))
    open(filename, 'w').write(fig_to_d3(fig, d3_loc='js/d3.v3.min.js'))
    

if __name__ == '__main__':
    test1("renderer_test-1.html")
    test2("renderer_test-2.html")

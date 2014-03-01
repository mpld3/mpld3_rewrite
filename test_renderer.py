import numpy as np
import matplotlib.pyplot as plt
from mpld3_rewrite import fig_to_d3

D3_URL = 'js/d3.v3.min.js'
MPLD3_URL = 'js/mpld3.v0.1.js'


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
    open(filename, 'w').write(fig_to_d3(fig, d3_url=D3_URL,
                                        mpld3_url=MPLD3_URL))


def test2(filename):
    np.random.seed(0)
    x, y = np.random.normal(0, 1, (2, 100))
    fig, ax = plt.subplots()
    ax.grid(True)
    ax.scatter(x, y, c=np.random.random(x.shape),
               s=100 + 300 * np.random.random(100),
               alpha=0.3)

    print("writing to {0}".format(filename))
    open(filename, 'w').write(fig_to_d3(fig, d3_url=D3_URL,
                                        mpld3_url=MPLD3_URL))


def test3(filename):
    fig, ax = plt.subplots()

    x = np.linspace(-2, 2, 20)
    y = x[:, None]
    X = np.zeros((20, 20, 4))

    X[:, :, 0] = np.exp(- (x - 1) ** 2 - (y) ** 2)
    X[:, :, 1] = np.exp(- (x + 0.71) ** 2 - (y - 0.71) ** 2)
    X[:, :, 2] = np.exp(- (x + 0.71) ** 2 - (y + 0.71) ** 2)
    X[:, :, 3] = np.exp(-0.25 * (x ** 2 + y ** 2))

    im = ax.imshow(X, extent=(10, 20, 10, 20),
                   origin='lower', zorder=1, interpolation='nearest')
    fig.colorbar(im, ax=ax)

    ax.text(16, 16, "overlaid text")
    ax.text(16, 15, "covered text", zorder=0)

    ax.set_title('An Image', size=20)
    ax.set_xlim(9, 21)
    ax.set_ylim(9, 21)

    print("writing to {0}".format(filename))
    open(filename, 'w').write(fig_to_d3(fig, d3_url=D3_URL,
                                        mpld3_url=MPLD3_URL))

def test4(filename):
    from sklearn.datasets import load_iris

    data = load_iris()
    X = data.data
    y = data.target

    # dither the data for clearer plotting
    X += 0.1 * np.random.random(X.shape)

    fig, ax = plt.subplots(4, 4, sharex="col", sharey="row", figsize=(8, 8))
    fig.subplots_adjust(left=0.05, right=0.95, bottom=0.05, top=0.95,
                        hspace=0.1, wspace=0.1)

    for i in range(4):
        for j in range(4):
            ax[3 - i, j].scatter(X[:, j], X[:, i],
                                 c=y, s=40, alpha=0.3)

    # remove tick labels
    for axi in ax.flat:
        for axis in [axi.xaxis, axi.yaxis]:
            axis.set_major_formatter(plt.NullFormatter())
            
    print("writing to {0}".format(filename))
    open(filename, 'w').write(fig_to_d3(fig, d3_url=D3_URL,
                                        mpld3_url=MPLD3_URL))



if __name__ == '__main__':
    test1("renderer_test-1.html")
    test2("renderer_test-2.html")
    test3("renderer_test-3.html")
    test4("renderer_test-4.html")

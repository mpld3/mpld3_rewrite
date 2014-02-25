try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

DESCRIPTION = "D3 Viewer for Matplotlib"
LONG_DESCRIPTION = open('README.md').read()
NAME = "mpld3_rewrite"
AUTHOR = "Jake VanderPlas"
AUTHOR_EMAIL = "jakevdp@cs.washington.edu"
MAINTAINER = "Jake VanderPlas"
MAINTAINER_EMAIL = "jakevdp@cs.washington.edu"
URL = 'http://mpld3.github.com'
DOWNLOAD_URL = 'http://github.com/jakevdp/mpld3'
LICENSE = 'BSD 3-clause'
VERSION = '0.1'

setup(name=NAME,
      version=VERSION,
      description=DESCRIPTION,
      long_description=LONG_DESCRIPTION,
      author=AUTHOR,
      author_email=AUTHOR_EMAIL,
      maintainer=MAINTAINER,
      maintainer_email=MAINTAINER_EMAIL,
      url=URL,
      download_url=DOWNLOAD_URL,
      license=LICENSE,
      packages=['mpld3_rewrite',
                'mpld3_rewrite/mplexporter',
                'mpld3_rewrite/mplexporter/renderers',
                'mpld3_rewrite/mplexporter/renderers/plotly'],
      classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Console',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Natural Language :: English',
        'Programming Language :: Python :: 2.6'],
     )

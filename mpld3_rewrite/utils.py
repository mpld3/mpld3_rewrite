import os


def get_id(obj, suffix=None):
    """Get a unique id for the object"""
    objid = str(os.getpid()) + str(id(obj))
    if suffix:
        objid += str(suffix)
    return objid

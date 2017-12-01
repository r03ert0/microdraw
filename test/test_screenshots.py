from PIL import Image
import numpy as np
import glob
import pytest
import os
import imagehash

cwd = os.path.dirname(os.path.abspath(__file__))
all_test_files = glob.glob(os.path.join(cwd,'*.png'))
@pytest.mark.parametrize('test_file', all_test_files)
def test_images(test_file):
    basename = os.path.basename(test_file)
    reference_file = os.path.join(cwd, 'reference',basename)
    test_data = Image.open(test_file)
    reference_data = Image.open(reference_file)
    msg = "{} does not equal {}".format(test_file, reference_file)
    assert imagehash.average_hash(test_data, 500) - imagehash.average_hash(reference_data, 500) < 10, msg


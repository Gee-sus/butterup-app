from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('brand', models.CharField(blank=True, max_length=120)),
                ('gtin', models.CharField(blank=True, max_length=14, null=True)),
                ('size_g', models.IntegerField(blank=True, null=True)),
                ('alt_names', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['brand', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chain', models.CharField(max_length=120)),
                ('name', models.CharField(max_length=255)),
                ('lat', models.FloatField()),
                ('lng', models.FloatField()),
                ('address', models.CharField(blank=True, max_length=255)),
            ],
            options={
                'ordering': ['chain', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Price',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, max_digits=8)),
                ('currency', models.CharField(default='NZD', max_length=3)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=models.CASCADE, related_name='photo_prices', to='photo_compare.product')),
                ('store', models.ForeignKey(on_delete=models.CASCADE, related_name='photo_prices', to='photo_compare.store')),
            ],
            options={
                'ordering': ['price', '-updated_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='price',
            unique_together={('product', 'store')},
        ),
    ]
